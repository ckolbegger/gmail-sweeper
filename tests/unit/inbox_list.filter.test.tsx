import { describe, expect, it } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { renderInboxList } from '@/tui/inbox_list.js';

interface FilterRenderOptions {
  isFilterActive: boolean;
  matchingCount: number;
  totalCount: number;
  emptyFilterMessage?: string;
}

type RenderInboxListWithFilter = (
  emails: Parameters<typeof renderInboxList>[0],
  options?: FilterRenderOptions
) => string[];

function getRenderInboxList(): RenderInboxListWithFilter {
  return renderInboxList as unknown as RenderInboxListWithFilter;
}

describe('inbox list filter mode', () => {
  it('should render filtered counts when a smart filter is active', () => {
    const lines = getRenderInboxList()(
      [
        createEmail({
          message_id: 'msg-1',
          received_at: Date.now(),
          subject: 'Receipt',
          sender: 'billing@example.com'
        })
      ],
      {
        isFilterActive: true,
        matchingCount: 1,
        totalCount: 3
      }
    );

    expect(lines[0]).toBe('Filtered: 1/3 emails');
    expect(lines.join('\n')).toContain('Receipt');
  });

  it('should render a no-match state when active filter has zero matches', () => {
    const lines = getRenderInboxList()([], {
      isFilterActive: true,
      matchingCount: 0,
      totalCount: 3
    });

    expect(lines).toEqual(['Filtered: 0/3 emails', '(no matches for active filter)']);
  });

  it('should keep existing unfiltered empty state when filter is inactive', () => {
    const lines = getRenderInboxList()([], {
      isFilterActive: false,
      matchingCount: 0,
      totalCount: 0
    });

    expect(lines).toEqual(['(no messages)']);
  });
});
