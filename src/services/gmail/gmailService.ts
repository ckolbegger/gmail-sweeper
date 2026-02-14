import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { IEmailService } from '../../types/interfaces';
import { Email, EmailFilter, PaginatedResponse } from '../../types/index';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as http from 'http';
import * as url from 'url';
import { exec } from 'child_process';
import { format } from 'date-fns';
import { convert } from 'html-to-text';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

export class GmailService implements IEmailService {
    private auth: OAuth2Client | null = null;
    private gmail: gmail_v1.Gmail | null = null;

    constructor() { }

    async isAuthenticated(): Promise<boolean> {
        return !!this.auth && !!this.gmail;
    }

    async authenticate(): Promise<void> {
        try {
            // 1. Load credentials
            const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
            const keys = JSON.parse(content);
            const web = keys.installed || keys.web;
            const { client_secret, client_id } = web;

            // Force the use of our local listener URI
            this.auth = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

            // Setup token refresh handling
            this.auth.on('tokens', (tokens) => {
                if (tokens.refresh_token) {
                    this.saveToken(tokens);
                }
            });

            // 2. Load token if exists, otherwise authorize
            try {
                const tokenContent = await fs.readFile(TOKEN_PATH, 'utf-8');
                this.auth.setCredentials(JSON.parse(tokenContent));
            } catch (error) {
                await this.authorizeNewUser();
            }

            this.gmail = google.gmail({ version: 'v1', auth: this.auth });

        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
    }

    private async saveToken(tokens: any): Promise<void> {
        try {
            const currentToken = await fs.readFile(TOKEN_PATH, 'utf-8').then(JSON.parse).catch(() => ({}));
            const newToken = { ...currentToken, ...tokens };
            await fs.writeFile(TOKEN_PATH, JSON.stringify(newToken));
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }

    private async authorizeNewUser(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.auth) return reject(new Error('No auth client'));

            const authUrl = this.auth.generateAuthUrl({
                access_type: 'offline',
                scope: SCOPES,
            });

            const server = http.createServer(async (req, res) => {
                try {
                    const requestUrl = new url.URL(req.url || '', `http://localhost:${PORT}`);
                    
                    if (requestUrl.pathname === '/oauth2callback') {
                        const code = requestUrl.searchParams.get('code');
                        
                        res.writeHead(200, { 'Content-Type': 'text/plain' });
                        res.end('Authentication successful! You can close this tab and return to the console.');
                        
                        if (code) {
                            const { tokens } = await this.auth!.getToken(code);
                            this.auth!.setCredentials(tokens);
                            await this.saveToken(tokens);
                            // Cleanup only after success
                            setTimeout(() => server.close(), 1000);
                            resolve();
                        } else {
                             reject(new Error('No code found in redirect'));
                             server.close();
                        }
                    } else {
                        // Ignore other requests (favicon, etc)
                        res.writeHead(404);
                        res.end();
                    }
                } catch (e) {
                    res.writeHead(500);
                    res.end('Server Error');
                    server.close();
                    reject(e);
                }
            });

            server.on('error', (e) => {
                reject(new Error(`Server error on port ${PORT}: ${e.message}`));
            });

            server.listen(PORT, () => {
                this.openUrl(authUrl);
            });
        });
    }

    private openUrl(url: string) {
        const start = (process.platform == 'darwin' ? 'open' : process.platform == 'win32' ? 'start' : 'xdg-open');
        exec(`${start} "${url}"`, (error) => {
            if (error) {
                // Silently fail if we can't open browser
            }
        });
    }

    async listEmails(filter: EmailFilter): Promise<PaginatedResponse<Email>> {
        if (!this.gmail) throw new Error('Not authenticated');

        const { maxResults = 10, pageToken, q = 'label:INBOX' } = filter;

        try {
            const response = await this.gmail.users.messages.list({
                userId: 'me',
                maxResults,
                pageToken,
                q
            });

            const messages = response.data.messages || [];
            const emails = await Promise.all(
                messages.map(async (msg) => {
                    return await this.getEmail(msg.id!);
                })
            );

            const sortedEmails = emails
                .filter((e): e is Email => e !== null)
                .sort((a, b) => Number(b.internalDate) - Number(a.internalDate));

            return {
                items: sortedEmails,
                nextPageToken: response.data.nextPageToken || undefined,
            };
        } catch (error) {
            throw error;
        }
    }

    async getEmail(id: string): Promise<Email | null> {
        if (!this.gmail) throw new Error('Not authenticated');

        try {
            const response = await this.gmail.users.messages.get({
                userId: 'me',
                id
            });

            const msg = response.data;
            const headers = msg.payload?.headers || [];

            const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

            return {
                id: msg.id!,
                threadId: msg.threadId!,
                labelIds: msg.labelIds || [],
                snippet: msg.snippet || '',
                internalDate: msg.internalDate || '',
                subject: getHeader('Subject'),
                from: getHeader('From'),
                to: getHeader('To'),
                date: format(new Date(parseInt(msg.internalDate || '0', 10)), 'MMM dd HH:mm'),
                body: this.getBody(msg.payload), 
                isUnread: (msg.labelIds || []).includes('UNREAD')
            };
        } catch (error) {
            console.error(`Error getting email ${id}:`, error);
            return null;
        }
    }

    private getBody(payload: any): string {
        let body = '';
        
        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain') {
                    body += this.decodeBase64(part.body.data);
                } else if (part.mimeType === 'text/html' && !body) {
                    // Fallback to HTML if no plain text found yet
                    const html = this.decodeBase64(part.body.data);
                    body += convert(html, {
                        wordwrap: false, // We handle wrapping in the UI
                    });
                } else if (part.parts) {
                    body += this.getBody(part);
                }
            }
        } else if (payload.body && payload.body.data) {
            const data = this.decodeBase64(payload.body.data);
            if (payload.mimeType === 'text/html') {
                body = convert(data, {
                    wordwrap: false,
                });
            } else {
                body = data;
            }
        }

        return body || payload.snippet || '';
    }

    private decodeBase64(data: string): string {
        if (!data) return '';
        // Gmail uses base64url encoding
        const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
        return Buffer.from(base64, 'base64').toString('utf-8');
    }
}
