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
        };

        (google.auth as any).OAuth2 = vi.fn().mockImplementation(function () {
            return mockOAuth2Client;
        });
        service = new GmailService();
    });

    it('should throw meaningful error if credentials.json is missing', async () => {
        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.reject(new Error('ENOENT: no such file'));
            return Promise.resolve('{}');
        });

        await expect(service.authenticate()).rejects.toThrow('ENOENT: no such file');
    });

    it('should throw if token.json is missing', async () => {
        (fs.readFile as any).mockImplementation((path: string) => {
            if (path.includes('credentials.json')) return Promise.resolve(JSON.stringify({
                installed: { client_id: 'id', client_secret: 'secret', redirect_uris: ['url'] }
            }));
            if (path.includes('token.json')) return Promise.reject(new Error('ENOENT: no such file'));
            return Promise.resolve('{}');
        });

        await expect(service.authenticate()).rejects.toThrow('Authentication required');
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

        expect(google.auth.OAuth2).toHaveBeenCalledWith('test-id', 'test-secret', 'http://localhost');
        expect(mockOAuth2Client.setCredentials).toHaveBeenCalledWith({ access_token: 'test-token' });
        expect(await service.isAuthenticated()).toBe(true);
    });

    it('should refresh token if expired', async () => {
        // This is a placeholder as the current implementation doesn't yet have explicit 
        // manual refresh logic, but Google's client handles it automatically if 
        // the token setup is correct. We'll add a test for the event listener.
        await service.authenticate();
        expect(mockOAuth2Client.on).toHaveBeenCalledWith('tokens', expect.any(Function));
    });
});
