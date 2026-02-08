import { createEmail, type Email } from '@/core/entities.js';
import { GmailError } from '@/core/errors.js';

export interface GmailMessageRef {
  id: string;
}

export interface GmailListResponse {
  data: {
    messages?: GmailMessageRef[];
    nextPageToken?: string;
  };
}

export interface GmailClientLike {
  users: {
    messages: {
      list: (params: {
        userId: string;
        labelIds: string[];
        pageToken?: string;
        maxResults?: number;
      }) => Promise<GmailListResponse>;
    };
  };
}

export interface GmailMessageHeader {
  name?: string;
  value?: string;
}

export interface GmailGetResponse {
  data: {
    id?: string;
    internalDate?: string;
    labelIds?: string[];
    payload?: {
      headers?: GmailMessageHeader[];
    };
  };
}

export interface GmailReadClientLike extends GmailClientLike {
  users: {
    messages: GmailClientLike['users']['messages'] & {
      get: (params: {
        userId: string;
        id: string;
        format: 'metadata';
        metadataHeaders: string[];
      }) => Promise<GmailGetResponse>;
    };
  };
}

export interface GmailListOptions {
  userId?: string;
  pageSize?: number;
  pageLimit?: number;
}

export interface GmailListDeps {
  sleep?: (ms: number) => Promise<void>;
}

const DEFAULT_PAGE_SIZE = 50;
const DEFAULT_PAGE_LIMIT = 5;
const RATE_LIMIT_STATUS = 429;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const HEADER_SUBJECT = 'subject';
const HEADER_FROM = 'from';
const HEADER_DATE = 'date';

const CATEGORY_MAP: Record<string, string> = {
  CATEGORY_PERSONAL: 'primary',
  CATEGORY_SOCIAL: 'social',
  CATEGORY_PROMOTIONS: 'promotions',
  CATEGORY_UPDATES: 'updates',
  CATEGORY_FORUMS: 'forums'
};

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: number; status?: number };
  return record.code === RATE_LIMIT_STATUS || record.status === RATE_LIMIT_STATUS;
}

export async function listInboxMessages(
  gmail: GmailClientLike,
  options: GmailListOptions = {},
  deps: GmailListDeps = {}
): Promise<GmailMessageRef[]> {
  const userId = options.userId ?? 'me';
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageLimit = options.pageLimit ?? DEFAULT_PAGE_LIMIT;
  const delay = deps.sleep ?? sleep;

  const messages: GmailMessageRef[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  let attempt = 0;

  while (pageCount < pageLimit) {
    try {
      const response = await gmail.users.messages.list({
        userId,
        labelIds: ['INBOX'],
        pageToken,
        maxResults: pageSize
      });

      const pageMessages = response.data.messages ?? [];
      messages.push(...pageMessages.filter((message) => Boolean(message.id)));

      pageToken = response.data.nextPageToken;
      pageCount += 1;
      attempt = 0;

      if (!pageToken) {
        break;
      }
    } catch (error) {
      if (!isRateLimitError(error)) {
        throw new GmailError('Failed to list inbox messages', {
          cause: error instanceof Error ? error.message : error
        });
      }

      attempt += 1;
      const backoffMs = Math.min(1000 * 2 ** attempt, 8000);
      await delay(backoffMs);
    }
  }

  return messages;
}

function findHeader(headers: GmailMessageHeader[] = [], name: string): string | undefined {
  const loweredName = name.toLowerCase();
  return headers.find((header) => header.name?.toLowerCase() === loweredName)?.value;
}

function parseReceivedAt(data: GmailGetResponse['data']): number | undefined {
  if (data.internalDate) {
    const timestamp = Number.parseInt(data.internalDate, 10);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }

  const parsedDate = Date.parse(findHeader(data.payload?.headers, HEADER_DATE) ?? '');
  if (Number.isFinite(parsedDate) && parsedDate > 0) {
    return parsedDate;
  }

  return undefined;
}

function mapCategory(labels: string[]): string | undefined {
  for (const label of labels) {
    if (CATEGORY_MAP[label]) {
      return CATEGORY_MAP[label];
    }
  }
  return undefined;
}

function mapMessageToEmail(data: GmailGetResponse['data']): Email | null {
  const messageId = data.id;
  const labels = data.labelIds ?? [];
  const receivedAt = parseReceivedAt(data);

  if (!messageId || !receivedAt) {
    return null;
  }

  try {
    return createEmail({
      message_id: messageId,
      received_at: receivedAt,
      subject: findHeader(data.payload?.headers, HEADER_SUBJECT),
      sender: findHeader(data.payload?.headers, HEADER_FROM),
      labels,
      category: mapCategory(labels),
      is_read: !labels.includes('UNREAD')
    });
  } catch {
    return null;
  }
}

export async function listInboxEmails(
  gmail: GmailReadClientLike,
  options: GmailListOptions = {},
  deps: GmailListDeps = {}
): Promise<Email[]> {
  const userId = options.userId ?? 'me';
  const refs = await listInboxMessages(gmail, options, deps);
  const emails: Email[] = [];

  for (const ref of refs) {
    try {
      const response = await gmail.users.messages.get({
        userId,
        id: ref.id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date']
      });

      const email = mapMessageToEmail(response.data);
      if (email) {
        emails.push(email);
      }
    } catch (error) {
      throw new GmailError('Failed to fetch inbox message metadata', {
        message_id: ref.id,
        cause: error instanceof Error ? error.message : error
      });
    }
  }

  return emails.sort((a, b) => b.received_at - a.received_at);
}
