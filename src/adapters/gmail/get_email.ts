import { GmailError } from '@/core/errors.js';

export interface GmailHeader {
  name?: string;
  value?: string;
}

export interface GmailPayloadPart {
  mimeType?: string;
  headers?: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailPayloadPart[];
}

export interface GmailGetFullResponse {
  data: {
    id?: string;
    internalDate?: string;
    labelIds?: string[];
    payload?: GmailPayloadPart;
    snippet?: string;
  };
}

export interface GmailDetailClientLike {
  users: {
    messages: {
      get: (params: {
        userId: string;
        id: string;
        format: 'full';
      }) => Promise<GmailGetFullResponse>;
    };
  };
}

export interface EmailDetail {
  message_id: string;
  subject: string;
  sender: string;
  received_at: number;
  body: string;
  headers: Record<string, string>;
  labels: string[];
  category?: string;
  is_read: boolean;
}

export interface EmailDetailOptions {
  userId?: string;
}

const CATEGORY_MAP: Record<string, string> = {
  CATEGORY_PERSONAL: 'primary',
  CATEGORY_SOCIAL: 'social',
  CATEGORY_PROMOTIONS: 'promotions',
  CATEGORY_UPDATES: 'updates',
  CATEGORY_FORUMS: 'forums'
};

function decodeBody(data: string | undefined): string | undefined {
  if (!data) {
    return undefined;
  }

  try {
    return Buffer.from(data, 'base64url').toString('utf8');
  } catch {
    return undefined;
  }
}

function findTextBody(part?: GmailPayloadPart): string | undefined {
  if (!part) {
    return undefined;
  }

  if (part.mimeType === 'text/plain') {
    const decoded = decodeBody(part.body?.data);
    if (decoded !== undefined) {
      return decoded;
    }
  }

  for (const child of part.parts ?? []) {
    const nested = findTextBody(child);
    if (nested !== undefined) {
      return nested;
    }
  }

  return decodeBody(part.body?.data);
}

function extractHeaders(payload?: GmailPayloadPart): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const header of payload?.headers ?? []) {
    const name = header.name?.trim().toLowerCase();
    if (!name || header.value === undefined) {
      continue;
    }
    headers[name] = header.value;
  }
  return headers;
}

function parseReceivedAt(internalDate?: string, dateHeader?: string): number | undefined {
  if (internalDate) {
    const timestamp = Number.parseInt(internalDate, 10);
    if (Number.isFinite(timestamp) && timestamp > 0) {
      return timestamp;
    }
  }

  if (dateHeader) {
    const parsedDate = Date.parse(dateHeader);
    if (Number.isFinite(parsedDate) && parsedDate > 0) {
      return parsedDate;
    }
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

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const record = error as { code?: number; status?: number };
  return record.code === 404 || record.status === 404;
}

export async function getEmailDetail(
  gmail: GmailDetailClientLike,
  messageId: string,
  options: EmailDetailOptions = {}
): Promise<EmailDetail> {
  const userId = options.userId ?? 'me';

  try {
    const response = await gmail.users.messages.get({
      userId,
      id: messageId,
      format: 'full'
    });
    const data = response.data;
    const resolvedId = data.id ?? messageId;
    const labels = data.labelIds ?? [];
    const headers = extractHeaders(data.payload);
    const receivedAt = parseReceivedAt(data.internalDate, headers.date);

    if (!resolvedId || !receivedAt) {
      throw new GmailError(`Invalid email payload for ${messageId}`, {
        message_id: messageId
      });
    }

    return {
      message_id: resolvedId,
      subject: headers.subject ?? '(no subject)',
      sender: headers.from ?? '(unknown sender)',
      received_at: receivedAt,
      body: findTextBody(data.payload) ?? data.snippet ?? '',
      headers,
      labels,
      category: mapCategory(labels),
      is_read: !labels.includes('UNREAD')
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new GmailError(`Email not found: ${messageId}`, {
        message_id: messageId
      });
    }

    if (error instanceof GmailError) {
      throw error;
    }

    throw new GmailError('Failed to fetch email detail', {
      message_id: messageId,
      cause: error instanceof Error ? error.message : error
    });
  }
}
