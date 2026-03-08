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

    it('should save summary to file using atomic rename', async () => {
        const mockSummary = { emailId: 'test-email-2', description: 'desc2', actionItems: ['item'], createdAt: 'time2' };
        
        // Mock reading existing empty file
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ summaries: {} }));
        
        await storage.saveSummary(mockSummary);
        
        expect(fs.mkdir).toHaveBeenCalledWith(path.join(mockHomedir, '.config', 'gmail-sweep'), { recursive: true });
        
        const tempFilePath = expect.stringMatching(/summaries\.json\.tmp\.\d+/);
        const finalFilePath = path.join(mockHomedir, '.config', 'gmail-sweep', 'summaries.json');

        expect(fs.writeFile).toHaveBeenCalledWith(
            tempFilePath,
            JSON.stringify({ summaries: { 'test-email-2': mockSummary } }, null, 2),
            'utf-8'
        );
        expect(fs.rename).toHaveBeenCalledWith(tempFilePath, finalFilePath);
    });

    it('should handle concurrent writes by queueing them', async () => {
        const summary1 = { emailId: '1', description: 'desc1', actionItems: [], createdAt: 'time1' };
        const summary2 = { emailId: '2', description: 'desc2', actionItems: [], createdAt: 'time2' };
        
        let readCount = 0;
        vi.mocked(fs.readFile).mockImplementation(async () => {
            readCount++;
            if (readCount === 1) {
                return JSON.stringify({ summaries: {} });
            } else {
                return JSON.stringify({ summaries: { '1': summary1 } });
            }
        });

        // Trigger two writes concurrently
        const p1 = storage.saveSummary(summary1);
        const p2 = storage.saveSummary(summary2);
        
        await Promise.all([p1, p2]);

        expect(fs.writeFile).toHaveBeenCalledTimes(2);
        expect(fs.rename).toHaveBeenCalledTimes(2);

        // Second write should contain both summaries (proving it waited for the first to finish)
        const secondWriteData = JSON.stringify({ summaries: { '1': summary1, '2': summary2 } }, null, 2);
        expect(fs.writeFile).toHaveBeenLastCalledWith(
            expect.any(String),
            secondWriteData,
            'utf-8'
        );
    });
});
