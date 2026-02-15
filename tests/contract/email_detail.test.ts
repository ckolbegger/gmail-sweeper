import { describe, expect, it } from 'vitest';

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

describe('email detail contract', () => {
  it('should return full content for a valid message_id', async () => {
    const client = createClient(async () => ({
      data: {
        id: 'msg-1',
        internalDate: `${Date.parse('2026-02-08T10:00:00Z')}`,
        payload: {
          headers: [
            { name: 'Subject', value: 'Daily Update' },
            { name: 'From', value: 'sender@example.com' }
          ],
          body: {
            data: Buffer.from('Body content').toString('base64url')
          }
        },
        labelIds: ['INBOX', 'UNREAD']
      }
    }));

    const detail = await getEmailDetail(client, 'msg-1');
    expect(detail.message_id).toBe('msg-1');
    expect(detail.body).toContain('Body content');
  });

  it('should return 404 for unknown message_id', async () => {
    const client = createClient(async () => {
      throw { status: 404 };
    });

    await expect(getEmailDetail(client, 'missing')).rejects.toThrow('Email not found: missing');
  });

  it('should include body and headers when available', async () => {
    const client = createClient(async () => ({
      data: {
        id: 'msg-2',
        internalDate: `${Date.parse('2026-02-08T10:00:00Z')}`,
        payload: {
          headers: [
            { name: 'Subject', value: 'Subject line' },
            { name: 'From', value: 'author@example.com' },
            { name: 'X-Custom', value: 'custom-value' }
          ],
          body: {
            data: Buffer.from('Detailed body').toString('base64url')
          }
        },
        labelIds: ['INBOX']
      }
    }));

    const detail = await getEmailDetail(client, 'msg-2');
    expect(detail.headers.subject).toBe('Subject line');
    expect(detail.headers.from).toBe('author@example.com');
    expect(detail.headers['x-custom']).toBe('custom-value');
    expect(detail.body).toContain('Detailed body');
  });
});
