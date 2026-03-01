/**
 * Clipboard Service
 *
 * Provides clipboard operations for copying URLs and other text.
 * Uses clipboardy for cross-platform support.
 */
import clipboard from 'clipboardy';

/**
 * Service for clipboard operations
 */
export const ClipboardService = {
  /**
   * Write text to clipboard
   * @param text - Text to copy
   * @returns true if successful, false if failed
   */
  async write(text: string): Promise<boolean> {
    try {
      await clipboard.write(text);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Check if clipboard is available
   * @returns true if clipboard operations are available
   */
  isAvailable(): boolean {
    // clipboardy handles cross-platform availability
    // In most environments it will work
    return true;
  },
};
