import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GmailService } from '../../src/services/gmail/gmailService';
import { google } from 'googleapis';
import * as fs from 'fs/promises';

vi.mock('googleapis');
vi.mock('fs/promises');

describe('GmailService Authentication', () => {
    let service: GmailService;
    let mockOAuth2Client: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockOAuth2Client = {
            setCredentials: vi.fn(),
            on: vi.fn(),
            getToken: vi.fn(),
            generateAuthUrl: vi.fn(),
        };

        (google.auth as any).OAuth2 = vi.fn().mockImplementation(function () {
            return mockOAuth2Client;
        });
        (google.gmail as any).mockReturnValue({}); // Ensure this.gmail is truthy
        service = new GmailService();
    });

    it('should throw if credentials.json is missing', async () => {
        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.reject(new Error('ENOENT: no such file'));
            return Promise.resolve('{}');
        });

        await expect(service.authenticate()).rejects.toThrow('ENOENT: no such file');
    });

    it('should call authorizeNewUser if token.json is missing', async () => {
        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.resolve(JSON.stringify({
                installed: { client_id: 'id', client_secret: 'secret', redirect_uris: ['url'] }
            }));
            if (path.includes('token.json')) return Promise.reject(new Error('ENOENT: no such file'));
            return Promise.resolve('{}');
        });

        const authorizeSpy = vi.spyOn(service as any, 'authorizeNewUser').mockResolvedValue(undefined);
        
        await service.authenticate();
        expect(authorizeSpy).toHaveBeenCalled();
    });

    it('should instantiate and authorize with valid credentials and token', async () => {
        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.resolve(JSON.stringify({
                installed: { client_id: 'test-id', client_secret: 'test-secret', redirect_uris: ['http://localhost'] }
            }));
            if (path.includes('token.json')) return Promise.resolve(JSON.stringify({ access_token: 'test-token' }));
            return Promise.resolve('{}');
        });

        await service.authenticate();

        expect(google.auth.OAuth2).toHaveBeenCalledWith('test-id', 'test-secret', 'http://localhost:3000/oauth2callback');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({ access_token: 'test-token' });
        expect(await service.isAuthenticated()).toBe(true);
    });

    it('should refresh token if expired', async () => {
        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.resolve(JSON.stringify({
                installed: { client_id: 'id', client_secret: 'secret', redirect_uris: ['url'] }
            }));
            if (path.includes('token.json')) return Promise.resolve(JSON.stringify({ access_token: 'test-token' }));
            return Promise.resolve('{}');
        });
        await service.authenticate();
        expect(mockOAuth2Client.on).toHaveBeenCalledWith('tokens', expect.any(Function));
    });
});

describe('GmailService listEmails', () => {
    let service: GmailService;
    let mockGmail: any;
    let mockOAuth2Client: any;

    beforeEach(async () => {
        vi.clearAllMocks();

        mockOAuth2Client = {
            setCredentials: vi.fn(),
            on: vi.fn(),
        };

        (google.auth as any).OAuth2 = vi.fn().mockImplementation(function () { return mockOAuth2Client; });

        mockGmail = {
            users: {
                messages: {
                    list: vi.fn(),
                    get: vi.fn()
                }
            }
        };
        (google.gmail as any).mockReturnValue(mockGmail);

        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.resolve(JSON.stringify({
                installed: { client_id: 'id', client_secret: 'secret', redirect_uris: ['url'] }
            }));
            if (path.includes('token.json')) return Promise.resolve(JSON.stringify({ access_token: 'test-token' }));
            return Promise.resolve('{}');
        });

        service = new GmailService();
        await service.authenticate();
    });

    it('should fetch emails with pagination tokens', async () => {
        mockGmail.users.messages.list.mockResolvedValue({
            data: {
                messages: [{ id: '1' }],
                nextPageToken: 'next-token'
            }
        });

        mockGmail.users.messages.get.mockResolvedValue({
            data: {
                id: '1',
                threadId: 't1',
                snippet: 'test snippet',
                internalDate: '1000',
                payload: {
                    headers: [
                        { name: 'Subject', value: 'Test Subject' },
                        { name: 'From', value: 'sender@test.com' },
                        { name: 'To', value: 'me@test.com' },
                        { name: 'Date', value: 'today' }
                    ]
                }
            }
        });

        const response = await service.listEmails({ maxResults: 10, pageToken: 'prev-token' });

        expect(mockGmail.users.messages.list).toHaveBeenCalledWith({
            userId: 'me',
            maxResults: 10,
            pageToken: 'prev-token',
            q: 'label:INBOX'
        });
        expect(response.nextPageToken).toBe('next-token');
        expect(response.items[0].id).toBe('1');
    });

    it('should extract full body from multipart message', async () => {
        mockGmail.users.messages.list.mockResolvedValue({
            data: { messages: [{ id: '1' }] }
        });

        const testBody = 'Hello, this is the full body content!';
        const encodedBody = Buffer.from(testBody).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

        mockGmail.users.messages.get.mockResolvedValue({
            data: {
                id: '1',
                payload: {
                    mimeType: 'multipart/alternative',
                    parts: [
                        {
                            mimeType: 'text/plain',
                            body: { data: encodedBody }
                        }
                    ],
                    headers: []
                }
            }
        });

        const response = await service.listEmails({});
        expect(response.items[0].body).toBe(testBody);
    });

    it('should sort emails by internalDate (descending)', async () => {
        mockGmail.users.messages.list.mockResolvedValue({
            data: {
                messages: [{ id: '1' }, { id: '2' }]
            }
        });

        mockGmail.users.messages.get.mockImplementation((params: any) => {
            const data = params.id === '1'
                ? { id: '1', internalDate: '1000', payload: { headers: [] } }
                : { id: '2', internalDate: '2000', payload: { headers: [] } };
            return Promise.resolve({ data });
        });

        const response = await service.listEmails({});
        expect(response.items[0].id).toBe('2');
        expect(response.items[1].id).toBe('1');
    });

    it('should handle API errors gracefully', async () => {
        mockGmail.users.messages.list.mockRejectedValue(new Error('API Error'));
        await expect(service.listEmails({})).rejects.toThrow('API Error');
    });

    it('should handle invalid/expired page tokens gracefully', async () => {
        mockGmail.users.messages.list.mockRejectedValue({ code: 400, message: 'Invalid page token' });
        await expect(service.listEmails({ pageToken: 'invalid' })).rejects.toMatchObject({ code: 400 });
    });

    it('should return empty list if API returns no messages', async () => {
        mockGmail.users.messages.list.mockResolvedValue({ data: { messages: [] } });
        const response = await service.listEmails({});
        expect(response.items).toEqual([]);
    });
});
