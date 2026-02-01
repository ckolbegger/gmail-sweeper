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
