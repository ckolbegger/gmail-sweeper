import { describe, expect, it, vi } from 'vitest';

import { getEmailDetail, type GmailDetailClientLike } from '@/adapters/gmail/get_email.js';

const createClient = (
  getImpl: GmailDetailClientLike['users']['messages']['get']
): GmailDetailClientLike => ({
  users: {
    messages: {
      get: getImpl
    }
  }
});

describe('email detail fetch adapter', () => {
  it('should fetch full body for a message_id', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        id: 'msg-1',
        internalDate: `${Date.parse('2026-02-08T10:00:00Z')}`,
        payload: {
          headers: [{ name: 'Subject', value: 'Hello' }],
          body: { data: Buffer.from('Hello body').toString('base64url') }
        },
        labelIds: ['INBOX']
      }
    });
    const client = createClient(get);

    const detail = await getEmailDetail(client, 'msg-1');

    expect(detail.body).toBe('Hello body');
    expect(get).toHaveBeenCalledOnce();
  });

  it('should return a clear error for missing message', async () => {
    const client = createClient(async () => {
      throw { code: 404 };
    });

    await expect(getEmailDetail(client, 'missing')).rejects.toThrow('Email not found: missing');
  });

  it('should avoid caching body after session', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: 'msg-1',
          internalDate: `${Date.parse('2026-02-08T10:00:00Z')}`,
          payload: {
            headers: [{ name: 'Subject', value: 'First' }],
            body: { data: Buffer.from('First body').toString('base64url') }
          },
          labelIds: ['INBOX']
        }
      })
      .mockResolvedValueOnce({
        data: {
          id: 'msg-1',
          internalDate: `${Date.parse('2026-02-08T10:00:00Z')}`,
          payload: {
            headers: [{ name: 'Subject', value: 'Second' }],
            body: { data: Buffer.from('Second body').toString('base64url') }
          },
          labelIds: ['INBOX']
        }
      });
    const client = createClient(get);

    const first = await getEmailDetail(client, 'msg-1');
    const second = await getEmailDetail(client, 'msg-1');

    expect(first.body).toBe('First body');
    expect(second.body).toBe('Second body');
    expect(get).toHaveBeenCalledTimes(2);
  });
});
