/**
 * Unit tests for BrowserService
 *
 * Tests browser opening operations for URLs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock open package
vi.mock('open', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

describe('BrowserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('open', () => {
    it('should open URL in default browser', async () => {
      const open = (await import('open')).default;
      const { BrowserService } = await import('../../../src/core/services/browser-service.js');

      const result = await BrowserService.open('https://example.com');

      expect(open).toHaveBeenCalledWith('https://example.com');
      expect(result).toBe(true);
    });

    it('should return false when browser open fails', async () => {
      const open = (await import('open')).default;
      open.mockRejectedValue(new Error('Browser unavailable'));

      const { BrowserService } = await import('../../../src/core/services/browser-service.js');

      const result = await BrowserService.open('https://example.com');

      expect(result).toBe(false);
    });

    it('should handle URLs with special characters', async () => {
      const open = (await import('open')).default;
      const { BrowserService } = await import('../../../src/core/services/browser-service.js');

      const result = await BrowserService.open('https://example.com/path?query=value&other=123');

      expect(open).toHaveBeenCalledWith('https://example.com/path?query=value&other=123');
      expect(result).toBe(true);
    });

    it('should reject invalid URLs', async () => {
      const { BrowserService } = await import('../../../src/core/services/browser-service.js');

      const result = await BrowserService.open('not-a-valid-url');

      expect(result).toBe(false);
    });
  });
});
