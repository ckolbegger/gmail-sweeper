import { describe, expect, it } from 'vitest';

import { buildEmailFilters } from '@/services/filter_service.js';

describe('filter builder', () => {
  it('should build filter criteria from inputs', () => {
    const filters = buildEmailFilters({
      sender: 'lead@work.com',
      dateFrom: 1700000000000,
      dateTo: 1700009999999,
      label: 'WORK',
      category: 'updates'
    });

    expect(filters).toEqual({
      sender: 'lead@work.com',
      dateFrom: 1700000000000,
      dateTo: 1700009999999,
      label: 'WORK',
      category: 'updates'
    });
  });

  it('should ignore empty filter values', () => {
    const filters = buildEmailFilters({
      sender: ' ',
      label: '',
      category: undefined
    });

    expect(filters).toEqual({
      sender: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      label: undefined,
      category: undefined
    });
  });

  it('should combine filters correctly', () => {
    const filters = buildEmailFilters({
      sender: 'welcome@service.com',
      label: 'INBOX'
    });

    expect(filters).toEqual({
      sender: 'welcome@service.com',
      dateFrom: undefined,
      dateTo: undefined,
      label: 'INBOX',
      category: undefined
    });
  });
});
