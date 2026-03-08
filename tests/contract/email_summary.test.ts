import { describe, expect, it } from 'vitest';

import { normalizeSummaryResponse, renderSummaryDetailLines } from '@/services/email_summary_service.js';

describe('email summary contract', () => {
  it('should render one sentence followed by bullet lines', () => {
    const normalized = normalizeSummaryResponse({
      summarySentence: 'Team requests a status update and owner assignment. Additional prose',
      actionItems: ['Post update in channel', 'Assign incident owner']
    });

    const lines = renderSummaryDetailLines(normalized);
    expect(lines[0]).toMatch(/[.!?]$/);
    expect(lines.slice(1)).toEqual(['- Post update in channel', '- Assign incident owner']);
  });

  it('should enforce "- None" fallback when no action items are present', () => {
    const normalized = normalizeSummaryResponse({
      summarySentence: 'No follow-up work is requested',
      actionItems: []
    });

    expect(renderSummaryDetailLines(normalized)).toEqual(['No follow-up work is requested.', '- None']);
  });
});
