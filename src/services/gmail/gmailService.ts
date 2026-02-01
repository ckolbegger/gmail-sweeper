import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { IEmailService } from '../../types/interfaces';
import { Email, EmailFilter, PaginatedResponse } from '../../types/index';
import * as fs from 'fs/promises';
import * as path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/gmail.modify'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

export class GmailService implements IEmailService {
    private auth: OAuth2Client | null = null;
    private gmail: gmail_v1.Gmail | null = null;

    constructor() { }

    async isAuthenticated(): Promise<boolean> {
        return !!this.auth;
    }

    async authenticate(): Promise<void> {
        try {
            // 1. Load credentials
            const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
            const keys = JSON.parse(content);
            const { client_secret, client_id, redirect_uris } = keys.installed || keys.web;

            this.auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

            // Setup token refresh handling
            this.auth.on('tokens', (tokens) => {
                if (tokens.refresh_token) {
                    // Logic to store new token would go here
                    // fs.writeFile(TOKEN_PATH, JSON.stringify(this.auth.credentials))
                }
            });

            // 2. Load token if exists
            try {
                const tokenContent = await fs.readFile(TOKEN_PATH, 'utf-8');
                this.auth.setCredentials(JSON.parse(tokenContent));
            } catch (error) {
                // Token doesn't exist, need to generate new one
                console.error('Token not found. Run auth script.');
                throw new Error('Authentication required');
            }

            this.gmail = google.gmail({ version: 'v1', auth: this.auth });

        } catch (error) {
            console.error('Authentication failed:', error);
            throw error;
        }
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

            // Filter out nulls and sort by internalDate (newest first)
            const sortedEmails = emails
                .filter((e): e is Email => e !== null)
                .sort((a, b) => Number(b.internalDate) - Number(a.internalDate));

            return {
                items: sortedEmails,
                nextPageToken: response.data.nextPageToken || undefined,
                resultSizeEstimate: response.data.resultSizeEstimate || 0
            };
        } catch (error) {
            // Re-throw if it's already an error object from API
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
                date: getHeader('Date'),
                body: msg.snippet || '', // Logic for body extraction would go here
                isUnread: (msg.labelIds || []).includes('UNREAD')
            };
        } catch (error) {
            console.error(`Error getting email ${id}:`, error);
            return null;
        }
    }
}
