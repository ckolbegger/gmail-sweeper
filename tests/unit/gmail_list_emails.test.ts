import { describe, expect, it, vi } from 'vitest';

import {
  listInboxEmails,
  listInboxMessages,
  type GmailClientLike,
  type GmailReadClientLike
} from '@/adapters/gmail/list_emails.js';

const createGmailClient = (listImpl: GmailClientLike['users']['messages']['list']): GmailClientLike => ({
  users: {
    messages: {
      list: listImpl
    }
  }
});

describe('gmail list adapter', () => {
  it('should request only inbox messages', async () => {
    const list = vi.fn().mockResolvedValue({ data: { messages: [] } });
    const client = createGmailClient(list);

    await listInboxMessages(client, { pageLimit: 1 });

    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        labelIds: ['INBOX']
      })
    );
  });

  it('should paginate until page limit or completion', async () => {
    const list = vi.fn()
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: 'msg-1' }],
          nextPageToken: 'next'
        }
      })
      .mockResolvedValueOnce({
        data: {
          messages: [{ id: 'msg-2' }]
        }
      });
    const client = createGmailClient(list);

    const results = await listInboxMessages(client, { pageLimit: 2 });

    expect(results.map((message) => message.id)).toEqual(['msg-1', 'msg-2']);
    expect(list).toHaveBeenCalledTimes(2);
  });

  it('should handle rate-limit backoff', async () => {
    const list = vi.fn()
      .mockRejectedValueOnce({ status: 429 })
      .mockResolvedValueOnce({ data: { messages: [{ id: 'msg-1' }] } });
    const sleep = vi.fn().mockResolvedValue(undefined);
    const client = createGmailClient(list);

    const results = await listInboxMessages(client, { pageLimit: 1 }, { sleep });

    expect(results).toHaveLength(1);
    expect(sleep).toHaveBeenCalledTimes(1);
    expect(list).toHaveBeenCalledTimes(2);
  });
});

describe('gmail metadata hydration', () => {
  it('should fetch subject/sender/date metadata for listed message ids', async () => {
    const list = vi.fn().mockResolvedValue({
      data: {
        messages: [{ id: 'msg-1' }]
      }
    });
    const get = vi.fn().mockResolvedValue({
      data: {
        id: 'msg-1',
        internalDate: `${Date.parse('2026-01-30T10:00:00Z')}`,
        labelIds: ['INBOX', 'UNREAD', 'CATEGORY_UPDATES'],
        payload: {
          headers: [
            { name: 'Subject', value: 'Team update' },
            { name: 'From', value: 'lead@work.com' }
          ]
        }
      }
    });

    const gmail = {
      users: {
        messages: {
          list,
          get
        }
      }
    } satisfies GmailReadClientLike;

    const emails = await listInboxEmails(gmail, { pageLimit: 1 });

    expect(emails).toHaveLength(1);
    expect(emails[0]?.subject).toBe('Team update');
    expect(emails[0]?.sender).toBe('lead@work.com');
    expect(emails[0]?.received_at).toBe(Date.parse('2026-01-30T10:00:00Z'));
  });

  it('should map Gmail labels to read state and category fields', async () => {
    const list = vi.fn().mockResolvedValue({
      data: {
        messages: [{ id: 'msg-1' }, { id: 'msg-2' }]
      }
    });
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 'msg-1',
          internalDate: `${Date.parse('2026-01-30T10:00:00Z')}`,
          labelIds: ['INBOX', 'UNREAD', 'CATEGORY_PROMOTIONS'],
          payload: { headers: [] }
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'msg-2',
          internalDate: `${Date.parse('2026-01-29T10:00:00Z')}`,
          labelIds: ['INBOX', 'CATEGORY_PERSONAL'],
          payload: { headers: [] }
        }
      });

    const gmail = {
      users: {
        messages: {
          list,
          get
        }
      }
    } satisfies GmailReadClientLike;

    const emails = await listInboxEmails(gmail, { pageLimit: 1 });

    expect(emails[0]?.is_read).toBe(false);
    expect(emails[0]?.category).toBe('promotions');
    expect(emails[1]?.is_read).toBe(true);
    expect(emails[1]?.category).toBe('primary');
  });

  it('should skip malformed message payloads without crashing listing', async () => {
    const list = vi.fn().mockResolvedValue({
      data: {
        messages: [{ id: 'msg-1' }, { id: 'msg-2' }]
      }
    });
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 'msg-1',
          internalDate: `${Date.parse('2026-01-30T10:00:00Z')}`,
          labelIds: ['INBOX'],
          payload: { headers: [{ name: 'Subject', value: 'Valid' }] }
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'msg-2',
          internalDate: 'not-a-number',
          labelIds: ['INBOX'],
          payload: { headers: [] }
        }
      });

    const gmail = {
      users: {
        messages: {
          list,
          get
        }
      }
    } satisfies GmailReadClientLike;

    const emails = await listInboxEmails(gmail, { pageLimit: 1 });

    expect(emails).toHaveLength(1);
    expect(emails[0]?.message_id).toBe('msg-1');
  });
});
