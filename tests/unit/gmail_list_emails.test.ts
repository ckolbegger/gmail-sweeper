import { describe, expect, it, vi } from 'vitest';

import { listInboxMessages, type GmailClientLike } from '@/adapters/gmail/list_emails.js';

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
