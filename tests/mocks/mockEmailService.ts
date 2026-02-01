import { IEmailService } from '../../src/types/interfaces';
import { Email, EmailFilter, PaginatedResponse } from '../../src/types/index';

export class MockEmailService implements IEmailService {
    private emails: Email[] = [];
    private authenticated = true;

    constructor(initialEmails: Email[] = []) {
        this.emails = initialEmails.length > 0 ? initialEmails : this.generateMockData(50);
    }

    private generateMockData(count: number): Email[] {
        return Array.from({ length: count }, (_, i) => ({
            id: `mock-id-${i}`,
            threadId: `mock-thread-${i}`,
            labelIds: i % 3 === 0 ? ['UNREAD', 'INBOX'] : ['INBOX'],
            snippet: `This is a snippet for email ${i}...`,
            internalDate: String(Date.now() - i * 3600000),
            subject: `Mock Subject ${i}`,
            from: `sender${i}@example.com`,
            to: 'me@example.com',
            date: new Date(Date.now() - i * 3600000).toISOString(),
            body: `<div><h1>Hello from Email ${i}</h1><p>Body content here.</p></div>`,
            isUnread: i % 3 === 0,
        }));
    }

    async listEmails(filter: EmailFilter): Promise<PaginatedResponse<Email>> {
        const { maxResults = 10, pageToken, q } = filter;

        let filtered = this.emails;

        // Basic query matching mock
        if (q) {
            const lowerQ = q.toLowerCase();
            filtered = filtered.filter(e =>
                e.subject.toLowerCase().includes(lowerQ) ||
                e.from.toLowerCase().includes(lowerQ)
            );
        }

        // Pagination logic (simple slice based on token index)
        const startIndex = pageToken ? parseInt(pageToken, 10) : 0;
        const endIndex = Math.min(startIndex + maxResults, filtered.length);
        const items = filtered.slice(startIndex, endIndex);

        const nextPageToken = endIndex < filtered.length ? String(endIndex) : undefined;

        return {
            items,
            nextPageToken,
            resultSizeEstimate: filtered.length
        };
    }

    async getEmail(id: string): Promise<Email | null> {
        return this.emails.find(e => e.id === id) || null;
    }

    async isAuthenticated(): Promise<boolean> {
        return this.authenticated;
    }

    async authenticate(): Promise<void> {
        this.authenticated = true;
    }
}
