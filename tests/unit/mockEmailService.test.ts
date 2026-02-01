import { describe, it, expect } from 'vitest';
import { MockEmailService } from '../mocks/mockEmailService';

describe('MockEmailService', () => {
    it('should generate mock data automatically', async () => {
        const service = new MockEmailService();
        const response = await service.listEmails({});
        expect(response.items.length).toBeGreaterThan(0);
        expect(response.resultSizeEstimate).toBeGreaterThan(0);
    });

    it('should support pagination (maxResults)', async () => {
        const service = new MockEmailService();
        const response = await service.listEmails({ maxResults: 5 });
        expect(response.items.length).toBe(5);
        expect(response.nextPageToken).toBeDefined();
    });

    it('should support pagination (pageToken)', async () => {
        const service = new MockEmailService();
        const firstPage = await service.listEmails({ maxResults: 5 });
        const secondPage = await service.listEmails({ maxResults: 5, pageToken: firstPage.nextPageToken });

        expect(secondPage.items.length).toBe(5);
        expect(secondPage.items[0].id).not.toBe(firstPage.items[0].id);
    });

    it('should support basic query filtering (q)', async () => {
        const service = new MockEmailService();
        const searchResponse = await service.listEmails({ q: 'Mock Subject 1' });
        expect(searchResponse.items.every(e => e.subject.includes('Mock Subject 1'))).toBe(true);
    });

    it('should handle getEmail(id) correctly', async () => {
        const service = new MockEmailService();
        const list = await service.listEmails({ maxResults: 1 });
        const email = await service.getEmail(list.items[0].id);
        expect(email).not.toBeNull();
        expect(email?.id).toBe(list.items[0].id);
    });
});
