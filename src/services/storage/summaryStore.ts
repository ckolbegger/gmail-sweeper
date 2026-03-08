import type { EmailSummary } from '../../types';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface ISummaryStorage {
  getSummary(emailId: string): Promise<EmailSummary | null>;
  saveSummary(summary: EmailSummary): Promise<void>;
}

export class SummaryStorage implements ISummaryStorage {
    private writeLock: Promise<void> = Promise.resolve();

    private getFilePath(): string {
        return path.join(os.homedir(), '.config', 'gmail-sweep', 'summaries.json');
    }

    private async readSummaries(): Promise<{ summaries: Record<string, EmailSummary> }> {
        try {
            const data = await fs.readFile(this.getFilePath(), 'utf-8');
            return JSON.parse(data);
        } catch (error: any) {
            if (error.code === 'ENOENT') {
                return { summaries: {} };
            }
            throw error;
        }
    }

    async getSummary(emailId: string): Promise<EmailSummary | null> {
        const data = await this.readSummaries();
        return data.summaries[emailId] || null;
    }

    async saveSummary(summary: EmailSummary): Promise<void> {
        const executeWrite = async () => {
            const dir = path.dirname(this.getFilePath());
            await fs.mkdir(dir, { recursive: true });
            
            const data = await this.readSummaries();
            data.summaries[summary.emailId] = summary;
            
            const finalPath = this.getFilePath();
            const tempPath = `${finalPath}.tmp.${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
            
            await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
            await fs.rename(tempPath, finalPath);
        };

        // Add to queue
        this.writeLock = this.writeLock.then(executeWrite).catch(() => executeWrite());
        return this.writeLock;
    }
}
