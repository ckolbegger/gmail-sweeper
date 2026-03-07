import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SummaryStorage } from '../../../../src/services/storage/summaryStore';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

vi.mock('fs/promises');
vi.mock('os');

describe('SummaryStorage', () => {
    let storage: SummaryStorage;
    const mockHomedir = '/mock/home';

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(os.homedir).mockReturnValue(mockHomedir);
        storage = new SummaryStorage();
    });

    it('should return null if file does not exist', async () => {
        const error = new Error('ENOENT');
        (error as any).code = 'ENOENT';
        vi.mocked(fs.readFile).mockRejectedValue(error);

        const summary = await storage.getSummary('test-email-1');
        expect(summary).toBeNull();
    });

    it('should return null if emailId not in file', async () => {
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ summaries: {} }));

        const summary = await storage.getSummary('test-email-1');
        expect(summary).toBeNull();
    });

    it('should return summary if emailId is in file', async () => {
        const mockSummary = { emailId: 'test-email-1', description: 'desc', actionItems: [], createdAt: 'time' };
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ summaries: { 'test-email-1': mockSummary } }));

        const summary = await storage.getSummary('test-email-1');
        expect(summary).toEqual(mockSummary);
    });

    it('should save summary to file', async () => {
        const mockSummary = { emailId: 'test-email-2', description: 'desc2', actionItems: ['item'], createdAt: 'time2' };
        
        // Mock reading existing empty file
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ summaries: {} }));
        
        await storage.saveSummary(mockSummary);
        
        expect(fs.mkdir).toHaveBeenCalledWith(path.join(mockHomedir, '.config', 'gmail-sweep'), { recursive: true });
        expect(fs.writeFile).toHaveBeenCalledWith(
            path.join(mockHomedir, '.config', 'gmail-sweep', 'summaries.json'),
            JSON.stringify({ summaries: { 'test-email-2': mockSummary } }, null, 2),
            'utf-8'
        );
    });
});
