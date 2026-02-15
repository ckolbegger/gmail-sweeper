import { describe, it, expect } from 'vitest';
import { estimateTokens, calculateBatchSize } from '../../../../src/services/filter/batchSizing';

describe('batchSizing', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens using chars/4 heuristic', () => {
      const text = 'abcd'; // 4 chars
      expect(estimateTokens(text)).toBe(1);
    });
  });

  describe('calculateBatchSize', () => {
    it('should calculate batch size based on budget', () => {
      const emails = Array.from({ length: 100 }, () => ({ id: '1', subject: 'test', senderName: 'name', senderEmail: 'e@t.com', snippet: 'snippet' }));
      const budget = 1000;
      const tokensPerEmail = estimateTokens(JSON.stringify(emails[0]));
      
      const batchSize = calculateBatchSize(emails, budget);
      expect(batchSize).toBeGreaterThan(0);
      expect(batchSize).toBeLessThanOrEqual(emails.length);
    });

    it('should return at least 1 even if emails are large', () => {
      const hugeEmail = { id: '1', subject: 'a'.repeat(100000), senderName: 'n', senderEmail: 'e', snippet: 's' };
      expect(calculateBatchSize([hugeEmail], 100)).toBe(1);
    });
  });
});
