/**
 * Unit tests for ClipboardService
 *
 * Tests clipboard operations for copying URLs
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock clipboardy
vi.mock('clipboardy', () => ({
  default: {
    write: vi.fn().mockResolvedValue(undefined),
    read: vi.fn().mockResolvedValue('test-url'),
  },
}));

describe('ClipboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('write', () => {
    it('should write text to clipboard', async () => {
      const { default: clipboard } = await import('clipboardy');
      const { ClipboardService } = await import('../../../src/core/services/clipboard-service.js');

      const result = await ClipboardService.write('https://example.com');

      expect(clipboard.write).toHaveBeenCalledWith('https://example.com');
      expect(result).toBe(true);
    });

    it('should return false when clipboard write fails', async () => {
      const { default: clipboard } = await import('clipboardy');
      clipboard.write = vi.fn().mockRejectedValue(new Error('Clipboard unavailable'));

      const { ClipboardService } = await import('../../../src/core/services/clipboard-service.js');

      const result = await ClipboardService.write('https://example.com');

      expect(result).toBe(false);
    });

    it('should handle empty string', async () => {
      const { ClipboardService } = await import('../../../src/core/services/clipboard-service.js');

      const result = await ClipboardService.write('');

      expect(result).toBe(true);
    });
  });

  describe('isAvailable', () => {
    it('should return true when clipboard is available', async () => {
      const { ClipboardService } = await import('../../../src/core/services/clipboard-service.js');

      const result = ClipboardService.isAvailable();

      expect(result).toBe(true);
    });
  });
});
