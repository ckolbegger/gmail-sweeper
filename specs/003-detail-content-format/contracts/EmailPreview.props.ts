/**
 * Contract: Updated props for src/tui/components/EmailPreview.tsx
 *
 * Changes from current interface:
 *   - Added `paneWidth` prop (required for half-width URL truncation, SC-004)
 */

import type { Email } from '../../../src/core/models/index.js';

export interface EmailPreviewProps {
  email: Email | undefined;
  maxHeight: number;
  scrollOffset?: number;
  /** Character width of the detail pane. Used to compute URL truncation limit (half-width). Defaults to 80. */
  paneWidth?: number;
}

/**
 * Keyboard bindings added to EmailPreview (P3 — non-mandatory):
 *
 *   Tab         — Focus next URL in body (wraps from last to first)
 *   Shift+Tab   — Focus previous URL in body (wraps from first to last)
 *   c           — Copy full URL of focused link to clipboard
 *   o           — Open full URL of focused link in system default browser
 *
 * These bindings are only active when the email body contains at least one URL.
 * When no URLs are present, Tab/Shift-Tab are ignored.
 * Focus state is reset to null when a different email is selected.
 */
