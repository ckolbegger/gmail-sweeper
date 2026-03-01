# Gmail API Research: Node.js/TypeScript Best Practices

## Overview

This document covers best practices for integrating with the Gmail API using Node.js/TypeScript and the `googleapis` npm package.

---

## Table of Contents

1. [OAuth2 Authentication & Token Refresh](#oauth2-authentication--token-refresh)
2. [Required OAuth2 Scopes](#required-oauth2-scopes)
3. [Pagination Patterns for Large Inboxes](#pagination-patterns-for-large-inboxes)
4. [Batch Operations](#batch-operations)
5. [Rate Limiting & Error Handling](#rate-limiting--error-handling)
6. [Incremental Sync with History API](#incremental-sync-with-history-api)
7. [Caching Strategies](#caching-strategies)
8. [TypeScript Type Definitions](#typescript-type-definitions)
9. [Complete Implementation Examples](#complete-implementation-examples)

---

## OAuth2 Authentication & Token Refresh

### Basic Setup

The `googleapis` library automatically handles token refresh when a `refresh_token` is present in credentials.

```typescript
import { google, Auth } from 'googleapis';

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Listen for token updates (captures refresh token on first authorization)
oauth2Client.on('tokens', async (tokens) => {
  if (tokens.refresh_token) {
    // Store refresh token securely (database, encrypted storage)
    await saveRefreshToken(tokens.refresh_token);
  }
  // Update stored access token
  await saveAccessToken(tokens.access_token);
});

// Set credentials with refresh token
oauth2Client.setCredentials({
  refresh_token: storedRefreshToken
});

// Create Gmail API client
const gmail = google.gmail({
  version: 'v1',
  auth: oauth2Client
});
```

### Generating Auth URL

The `refresh_token` is **only returned on the first authorization**. Use `prompt: 'consent'` to force re-consent.

```typescript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',     // Required to get refresh_token
  scope: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.labels'
  ],
  prompt: 'consent'           // Force consent to get refresh_token
});
```

### Exchanging Authorization Code

```typescript
async function exchangeCodeForTokens(code: string): Promise<void> {
  const { tokens } = await oauth2Client.getToken(code);

  oauth2Client.setCredentials(tokens);

  if (tokens.refresh_token) {
    await saveRefreshToken(tokens.refresh_token);
  }
  await saveAccessToken(tokens.access_token);
}
```

### Important Notes

| Aspect | Details |
|--------|---------|
| **Automatic Refresh** | Library automatically refreshes expired access tokens |
| **Refresh Token Lifetime** | May expire if: user revokes access, unused for 6 months, user changes password (with Gmail scopes), or max tokens exceeded |
| **Testing Apps** | Tokens expire in 7 days for apps with "Testing" status |
| **First Authorization Only** | `refresh_token` only returned on first consent |

---

## Required OAuth2 Scopes

### Core Scopes

| Scope | Description | Use Case |
|-------|-------------|----------|
| `https://www.googleapis.com/auth/gmail.readonly` | Read all resources and metadata | Read-only email access |
| `https://www.googleapis.com/auth/gmail.modify` | All read/write except permanent deletion | Read, modify labels, trash messages |
| `https://www.googleapis.com/auth/gmail.labels` | Create, read, update, delete labels | Label management only |
| `https://mail.google.com/` | Full access including permanent deletion | Full access (restricted by Google) |

### Additional Scopes

| Scope | Description |
|-------|-------------|
| `https://www.googleapis.com/auth/gmail.compose` | Create, read, update, delete drafts; send messages |
| `https://www.googleapis.com/auth/gmail.send` | Send messages only |
| `https://www.googleapis.com/auth/gmail.insert` | Insert and import messages |
| `https://www.googleapis.com/auth/gmail.metadata` | Read metadata (labels, headers) but not body/attachments |

### Recommended Scope Combination

For read + modify operations (apply labels, archive, delete):

```typescript
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.labels'
];
```

**Note**: `gmail.modify` does NOT include creating new labels. You need both `gmail.modify` AND `gmail.labels` for full label management.

---

## Pagination Patterns for Large Inboxes

### Token-Based Pagination

The Gmail API uses token-based pagination (not offset-based). Each response includes a `nextPageToken` when more results are available.

```typescript
import { gmail_v1 } from 'googleapis';

async function* listMessagesPaginated(
  gmail: gmail_v1.Gmail,
  query?: string,
  maxResultsPerPage: number = 500
): AsyncGenerator<gmail_v1.Schema$Message[], void, unknown> {
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: maxResultsPerPage,
      pageToken
    });

    if (response.data.messages) {
      yield response.data.messages;
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);
}

// Usage: Process 50K+ emails without loading all into memory
async function processLargeInbox(gmail: gmail_v1.Gmail): Promise<void> {
  for await (const page of listMessagesPaginated(gmail, 'is:unread', 500)) {
    for (const message of page) {
      await processMessage(message.id!);
    }
  }
}
```

### Key Pagination Parameters

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `maxResults` | Maximum items per page | 100 | 500 |
| `pageToken` | Token for next page | - | - |
| `q` | Gmail search query | - | - |

### Important Considerations

- **No Previous Page**: API only provides `nextPageToken` — no backward navigation
- **Token Expiration**: Page tokens can expire; handle 400 errors gracefully
- **Memory Efficiency**: Use generators to stream results without accumulating all in memory

---

## Batch Operations

### Gmail API Batch HTTP Endpoint

The Gmail API does NOT have native `batchGet` for messages. Use Google's **Batch HTTP** endpoint to combine multiple requests.

**Endpoint**: `POST https://gmail.googleapis.com/batch/gmail/v1`

**Limitations**:
- Maximum 100 calls per batch
- Batches >50 calls risk rate limits
- Each request in batch counts against rate limits

### Manual Batch Request Construction

```typescript
import { GaxiosResponse } from 'gaxios';

interface BatchRequestPart {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  body?: string;
}

function createBatchRequestBody(requests: BatchRequestPart[]): string {
  const boundary = 'batch_boundary_' + Date.now();

  const parts = requests.map(req => {
    let part = `Content-Type: application/http\n`;
    part += `Content-Transfer-Encoding: binary\n`;
    part += `Content-ID: <${req.id}>\n\n`;
    part += `${req.method} ${req.path} HTTP/1.1\n`;

    if (req.headers) {
      Object.entries(req.headers).forEach(([key, value]) => {
        part += `${key}: ${value}\n`;
      });
    }

    if (req.body) {
      part += `Content-Type: application/json; charset=utf-8\n\n`;
      part += req.body;
    }

    return part;
  });

  return `--${boundary}\n` +
         parts.join(`\n--${boundary}\n`) +
         `\n--${boundary}--`;
}

// Fetch multiple message details in batch
async function batchGetMessages(
  accessToken: string,
  messageIds: string[],
  format: 'minimal' | 'full' | 'raw' | 'metadata' = 'full'
): Promise<Map<string, any>> {
  const batchSize = 100; // Gmail API limit
  const results = new Map<string, any>();

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    const requests: BatchRequestPart[] = batch.map((id, index) => ({
      id: `msg-${index}`,
      method: 'GET',
      path: `/gmail/v1/users/me/messages/${id}?format=${format}`
    }));

    const body = createBatchRequestBody(requests);
    const boundary = body.split('\n')[0].slice(2);

    const response = await fetch('https://gmail.googleapis.com/batch/gmail/v1', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': `multipart/mixed; boundary=${boundary}`
      },
      body
    });

    const responseText = await response.text();
    const parsedResults = parseBatchResponse(responseText);

    // Merge results
    parsedResults.forEach((value, key) => results.set(key, value));

    // Rate limiting delay between batches
    if (i + batchSize < messageIds.length) {
      await sleep(1000);
    }
  }

  return results;
}
```

### Native Batch Operations (batchModify, batchDelete)

Gmail API provides native batch operations for modifying and deleting:

```typescript
// Batch modify labels (up to 1000 message IDs)
async function batchModifyLabels(
  gmail: gmail_v1.Gmail,
  messageIds: string[],
  addLabels: string[],
  removeLabels: string[]
): Promise<void> {
  const batchSize = 1000; // Gmail API limit for batchModify

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    await gmail.users.messages.batchModify({
      userId: 'me',
      requestBody: {
        ids: batch,
        addLabelIds: addLabels,
        removeLabelIds: removeLabels
      }
    });
  }
}

// Batch delete messages (permanent deletion - requires full scope)
async function batchDeleteMessages(
  gmail: gmail_v1.Gmail,
  messageIds: string[]
): Promise<void> {
  const batchSize = 1000;

  for (let i = 0; i < messageIds.length; i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    await gmail.users.messages.batchDelete({
      userId: 'me',
      requestBody: {
        ids: batch
      }
    });
  }
}

// Archive messages (remove INBOX label)
async function archiveMessages(
  gmail: gmail_v1.Gmail,
  messageIds: string[]
): Promise<void> {
  await batchModifyLabels(
    gmail,
    messageIds,
    [], // add labels
    ['INBOX'] // remove labels
  );
}
```

---

## Rate Limiting & Error Handling

### Gmail API Quota Limits

| Limit | Value |
|-------|-------|
| Per-project quota | 1.2 million quota units/minute |
| Per-user limit | 15,000 requests/minute |

### Method Quota Costs

| Method | Quota Units |
|--------|-------------|
| `users.getProfile` | 1 |
| `users.messages.list` | 5 |
| `users.messages.get` | 5 |
| `users.messages.modify` | 5 |
| `users.messages.batchModify` | 5 |
| `users.messages.send` | 100 |
| `users.messages.import` | 100 |
| `users.history.list` | 2 |

### Exponential Backoff Implementation

```typescript
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  retryableStatusCodes: [429, 500, 502, 503, 504]
};

class GmailApiError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly statusText: string,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'GmailApiError';
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateBackoff(
  attempt: number,
  config: RetryConfig,
  retryAfter?: number
): number {
  if (retryAfter) {
    return retryAfter * 1000;
  }

  // Exponential backoff with jitter
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelayMs);
  const jitter = Math.random() * 1000;

  return cappedDelay + jitter;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  for (let attempt = 0; attempt < fullConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const statusCode = error.code || error.status || error.response?.status;
      const isRetryable = fullConfig.retryableStatusCodes.includes(statusCode);
      const isLastAttempt = attempt === fullConfig.maxRetries - 1;

      if (!isRetryable || isLastAttempt) {
        throw error;
      }

      // Extract Retry-After header for 429 errors
      const retryAfter = error.response?.headers?.['retry-after'];
      const delay = calculateBackoff(attempt, fullConfig, retryAfter);

      console.warn(`Retry ${attempt + 1}/${fullConfig.maxRetries} after ${delay}ms due to error:`, error.message);

      await sleep(delay);
    }
  }

  throw new Error('Unexpected: retry loop completed without success or error');
}

// Usage with Gmail API
async function getMessageWithRetry(
  gmail: gmail_v1.Gmail,
  messageId: string
): Promise<gmail_v1.Schema$Message> {
  return withRetry(async () => {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId
    });
    return response.data;
  });
}
```

### Error Handling Patterns

```typescript
async function handleGmailError(error: any): Promise<void> {
  const code = error.code || error.status;

  switch (code) {
    case 400:
      // Bad request - check request parameters
      console.error('Bad request:', error.message);
      throw new Error(`Invalid request: ${error.message}`);

    case 401:
      // Unauthorized - token expired or invalid
      console.error('Authentication failed - re-authentication required');
      throw new Error('Authentication required');

    case 403:
      if (error.message?.includes('rateLimitExceeded')) {
        console.error('Rate limit exceeded - backing off');
        // Handled by retry logic
      } else if (error.message?.includes('userRateLimitExceeded')) {
        console.error('User rate limit exceeded');
        // May need longer backoff or quota increase
      } else {
        console.error('Forbidden:', error.message);
      }
      throw error;

    case 404:
      // Resource not found or historyId expired
      console.error('Resource not found:', error.message);
      throw new Error('Resource not found or sync token expired');

    case 429:
      // Too many requests - handled by retry logic
      console.error('Too many requests');
      throw error;

    case 500:
    case 502:
    case 503:
    case 504:
      // Server errors - safe to retry
      console.error('Server error:', code);
      throw error;

    default:
      console.error('Unexpected error:', error);
      throw error;
  }
}
```

---

## Incremental Sync with History API

### Core Concepts

The `historyId` is a monotonically increasing identifier representing the mailbox's current state. Use it to sync only changes since the last session.

**Important**: History records are typically valid for ~1 week, but may expire sooner. Handle 404 errors by falling back to full sync.

### Sync Implementation

```typescript
interface SyncState {
  historyId: string;
  lastSyncTime: Date;
}

interface SyncResult {
  messagesAdded: gmail_v1.Schema$HistoryMessageAdded[];
  messagesDeleted: gmail_v1.Schema$HistoryMessageDeleted[];
  labelsAdded: gmail_v1.Schema$HistoryLabelAdded[];
  labelsRemoved: gmail_v1.Schema$HistoryLabelRemoved[];
  newHistoryId: string;
}

async function getCurrentHistoryId(
  gmail: gmail_v1.Gmail
): Promise<string> {
  const profile = await gmail.users.getProfile({ userId: 'me' });
  return profile.data.historyId!;
}

async function syncChanges(
  gmail: gmail_v1.Gmail,
  previousState: SyncState | null
): Promise<SyncResult> {
  // If no previous state or history expired, perform full sync
  if (!previousState) {
    return performFullSync(gmail);
  }

  try {
    return await performIncrementalSync(gmail, previousState.historyId);
  } catch (error: any) {
    if (error.code === 404) {
      console.warn('History ID expired, falling back to full sync');
      return performFullSync(gmail);
    }
    throw error;
  }
}

async function performIncrementalSync(
  gmail: gmail_v1.Gmail,
  startHistoryId: string
): Promise<SyncResult> {
  const result: SyncResult = {
    messagesAdded: [],
    messagesDeleted: [],
    labelsAdded: [],
    labelsRemoved: [],
    newHistoryId: startHistoryId
  };

  let pageToken: string | undefined;

  do {
    const response = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      pageToken,
      historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved']
    });

    const history = response.data.history || [];

    for (const record of history) {
      if (record.messagesAdded) {
        result.messagesAdded.push(...record.messagesAdded);
      }
      if (record.messagesDeleted) {
        result.messagesDeleted.push(...record.messagesDeleted);
      }
      if (record.labelsAdded) {
        result.labelsAdded.push(...record.labelsAdded);
      }
      if (record.labelsRemoved) {
        result.labelsRemoved.push(...record.labelsRemoved);
      }
    }

    // Update to latest history ID
    if (response.data.historyId) {
      result.newHistoryId = response.data.historyId;
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return result;
}

async function performFullSync(
  gmail: gmail_v1.Gmail
): Promise<SyncResult> {
  const result: SyncResult = {
    messagesAdded: [],
    messagesDeleted: [],
    labelsAdded: [],
    labelsRemoved: [],
    newHistoryId: ''
  };

  // Fetch all messages
  for await (const page of listMessagesPaginated(gmail)) {
    for (const message of page) {
      result.messagesAdded.push({ message });
    }
  }

  // Get current history ID for next incremental sync
  result.newHistoryId = await getCurrentHistoryId(gmail);

  return result;
}
```

### Push Notifications (Real-time Sync)

Set up Google Cloud Pub/Sub for real-time notifications:

```typescript
async function setupPushNotifications(
  gmail: gmail_v1.Gmail,
  pubsubTopic: string
): Promise<gmail_v1.Schema$WatchResponse> {
  const response = await gmail.users.watch({
    userId: 'me',
    requestBody: {
      topicName: pubsubTopic,
      labelIds: ['INBOX'],
      labelFilterAction: 'include'
    }
  });

  // Store expiration time
  const expiration = response.data.expiration;
  console.log(`Watch expires at: ${new Date(parseInt(expiration!))}`);

  return response.data;
}

async function stopPushNotifications(
  gmail: gmail_v1.Gmail
): Promise<void> {
  await gmail.users.stop({ userId: 'me' });
}
```

---

## Caching Strategies

### Email Metadata Caching

Cache immutable message metadata to reduce API calls:

```typescript
interface CachedMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  headers: {
    subject?: string;
    from?: string;
    to?: string;
    date?: string;
  };
  internalDate: string;
  historyId: string;
  cachedAt: Date;
}

interface CacheEntry<T> {
  data: T;
  expiresAt: Date;
}

class MessageCache {
  private cache = new Map<string, CacheEntry<CachedMessage>>();
  private readonly ttlMs: number;

  constructor(ttlMinutes: number = 60) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(messageId: string): CachedMessage | undefined {
    const entry = this.cache.get(messageId);
    if (!entry) return undefined;

    if (new Date() > entry.expiresAt) {
      this.cache.delete(messageId);
      return undefined;
    }

    return entry.data;
  }

  set(messageId: string, message: CachedMessage): void {
    this.cache.set(messageId, {
      data: message,
      expiresAt: new Date(Date.now() + this.ttlMs)
    });
  }

  invalidate(messageId: string): void {
    this.cache.delete(messageId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}

// Extract headers for caching
function extractHeaders(
  message: gmail_v1.Schema$Message
): CachedMessage['headers'] {
  const headers = message.payload?.headers || [];

  return {
    subject: headers.find(h => h.name === 'Subject')?.value,
    from: headers.find(h => h.name === 'From')?.value,
    to: headers.find(h => h.name === 'To')?.value,
    date: headers.find(h => h.name === 'Date')?.value
  };
}
```

### Label Caching

Labels change infrequently and should be cached:

```typescript
class LabelCache {
  private labels: Map<string, gmail_v1.Schema$Label> = new Map();
  private lastFetch: Date | null = null;
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

  async getLabels(
    gmail: gmail_v1.Gmail,
    forceRefresh = false
  ): Promise<gmail_v1.Schema$Label[]> {
    if (forceRefresh || this.isStale()) {
      await this.refresh(gmail);
    }
    return Array.from(this.labels.values());
  }

  async getLabelById(
    gmail: gmail_v1.Gmail,
    labelId: string
  ): Promise<gmail_v1.Schema$Label | undefined> {
    if (this.isStale()) {
      await this.refresh(gmail);
    }
    return this.labels.get(labelId);
  }

  private isStale(): boolean {
    if (!this.lastFetch) return true;
    return Date.now() - this.lastFetch.getTime() > this.ttlMs;
  }

  private async refresh(gmail: gmail_v1.Gmail): Promise<void> {
    const response = await gmail.users.labels.list({ userId: 'me' });

    this.labels.clear();
    for (const label of response.data.labels || []) {
      if (label.id) {
        this.labels.set(label.id, label);
      }
    }

    this.lastFetch = new Date();
  }
}
```

---

## TypeScript Type Definitions

### Official `googleapis` Package

The official `googleapis` package includes built-in TypeScript definitions. No separate `@types` package needed.

```typescript
import {
  google,
  gmail_v1,      // Gmail API v1 namespace
  Auth,          // Authentication types
  Common         // Common utility types
} from 'googleapis';

// Type aliases for convenience
type Gmail = gmail_v1.Gmail;
type Message = gmail_v1.Schema$Message;
type MessagePart = gmail_v1.Schema$MessagePart;
type Label = gmail_v1.Schema$Label;
type History = gmail_v1.Schema$History;
type ListMessagesResponse = gmail_v1.Schema$ListMessagesResponse;
type ListHistoryResponse = gmail_v1.Schema$ListHistoryResponse;

// Request parameter types
type ListMessagesParams = gmail_v1.Params$Resource$Users$Messages$List;
type GetMessageParams = gmail_v1.Params$Resource$Users$Messages$Get;
type ModifyMessageParams = gmail_v1.Params$Resource$Users$Messages$Modify;
type BatchModifyParams = gmail_v1.Params$Resource$Users$Messages$Batchmodify;

// OAuth2 types
type OAuth2Client = Auth.OAuth2Client;
type Credentials = Auth.Credentials;
```

### Custom Type Extensions

```typescript
// Extend types for application-specific needs
interface EnrichedMessage extends gmail_v1.Schema$Message {
  parsedHeaders: {
    subject: string;
    from: string;
    to: string[];
    cc: string[];
    bcc: string[];
    date: Date;
    messageId: string;
  };
  bodyText?: string;
  bodyHtml?: string;
  attachments: AttachmentInfo[];
}

interface AttachmentInfo {
  filename: string;
  mimeType: string;
  size: number;
  attachmentId: string;
}

// Type guards for message parts
function isTextPlain(part: gmail_v1.Schema$MessagePart): boolean {
  return part.mimeType === 'text/plain';
}

function isTextHtml(part: gmail_v1.Schema$MessagePart): boolean {
  return part.mimeType === 'text/html';
}

function isAttachment(part: gmail_v1.Schema$MessagePart): boolean {
  return !!part.body?.attachmentId;
}
```

---

## Complete Implementation Examples

### Gmail Service Class

```typescript
import { google, gmail_v1, Auth } from 'googleapis';
import { GaxiosPromise } from 'gaxios';

export class GmailService {
  private gmail: gmail_v1.Gmail;
  private oauth2Client: Auth.OAuth2Client;
  private messageCache: MessageCache;
  private labelCache: LabelCache;

  constructor(
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ) {
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    this.gmail = google.gmail({
      version: 'v1',
      auth: this.oauth2Client
    });

    this.messageCache = new MessageCache(60);
    this.labelCache = new LabelCache();

    // Listen for token refresh
    this.oauth2Client.on('tokens', async (tokens) => {
      if (tokens.refresh_token) {
        await this.saveRefreshToken(tokens.refresh_token);
      }
    });
  }

  async initialize(refreshToken: string): Promise<void> {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    // Verify credentials work
    await this.gmail.users.getProfile({ userId: 'me' });
  }

  generateAuthUrl(scopes: string[]): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async exchangeCode(code: string): Promise<string | undefined> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens.refresh_token;
  }

  // Message Operations

  async* listMessages(
    query?: string,
    maxResultsPerPage: number = 500
  ): AsyncGenerator<gmail_v1.Schema$Message[], void, unknown> {
    let pageToken: string | undefined;

    do {
      const response = await withRetry(() =>
        this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: maxResultsPerPage,
          pageToken
        })
      );

      if (response.data.messages) {
        yield response.data.messages;
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  async getMessage(
    messageId: string,
    format: 'minimal' | 'full' | 'raw' | 'metadata' = 'full'
  ): Promise<gmail_v1.Schema$Message> {
    // Check cache for full format
    if (format === 'full') {
      const cached = this.messageCache.get(messageId);
      if (cached) {
        return cached as gmail_v1.Schema$Message;
      }
    }

    const message = await withRetry(() =>
      this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format
      })
    );

    // Cache if full format
    if (format === 'full') {
      this.messageCache.set(messageId, {
        ...message.data,
        cachedAt: new Date()
      } as CachedMessage);
    }

    return message.data;
  }

  async modifyLabels(
    messageId: string,
    addLabels: string[],
    removeLabels: string[]
  ): Promise<gmail_v1.Schema$Message> {
    const response = await withRetry(() =>
      this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: addLabels,
          removeLabelIds: removeLabels
        }
      })
    );

    // Invalidate cache
    this.messageCache.invalidate(messageId);

    return response.data;
  }

  async batchModifyLabels(
    messageIds: string[],
    addLabels: string[],
    removeLabels: string[]
  ): Promise<void> {
    const batchSize = 1000;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      await withRetry(() =>
        this.gmail.users.messages.batchModify({
          userId: 'me',
          requestBody: {
            ids: batch,
            addLabelIds: addLabels,
            removeLabelIds: removeLabels
          }
        })
      );

      // Invalidate cache for modified messages
      batch.forEach(id => this.messageCache.invalidate(id));
    }
  }

  async archiveMessages(messageIds: string[]): Promise<void> {
    await this.batchModifyLabels(messageIds, [], ['INBOX']);
  }

  async trashMessages(messageIds: string[]): Promise<void> {
    const batchSize = 1000;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(id =>
          withRetry(() =>
            this.gmail.users.messages.trash({
              userId: 'me',
              id
            })
          )
        )
      );

      batch.forEach(id => this.messageCache.invalidate(id));
    }
  }

  // Label Operations

  async getLabels(): Promise<gmail_v1.Schema$Label[]> {
    return this.labelCache.getLabels(this.gmail);
  }

  async createLabel(
    name: string,
    options: {
      messageListVisibility?: 'show' | 'hide';
      labelListVisibility?: 'labelShow' | 'labelHide' | 'labelShowIfUnread';
      backgroundColor?: string;
      textColor?: string;
    } = {}
  ): Promise<gmail_v1.Schema$Label> {
    const response = await withRetry(() =>
      this.gmail.users.labels.create({
        userId: 'me',
        requestBody: {
          name,
          messageListVisibility: options.messageListVisibility,
          labelListVisibility: options.labelListVisibility,
          color: options.backgroundColor ? {
            backgroundColor: options.backgroundColor,
            textColor: options.textColor || '#000000'
          } : undefined
        }
      })
    );

    await this.labelCache.getLabels(this.gmail, true);

    return response.data;
  }

  // Sync Operations

  async getCurrentHistoryId(): Promise<string> {
    const profile = await this.gmail.users.getProfile({ userId: 'me' });
    return profile.data.historyId!;
  }

  async syncChanges(
    startHistoryId?: string
  ): Promise<SyncResult> {
    if (!startHistoryId) {
      return this.performFullSync();
    }

    try {
      return await this.performIncrementalSync(startHistoryId);
    } catch (error: any) {
      if (error.code === 404) {
        console.warn('History ID expired, falling back to full sync');
        return this.performFullSync();
      }
      throw error;
    }
  }

  private async performIncrementalSync(
    startHistoryId: string
  ): Promise<SyncResult> {
    const result: SyncResult = {
      messagesAdded: [],
      messagesDeleted: [],
      labelsAdded: [],
      labelsRemoved: [],
      newHistoryId: startHistoryId
    };

    let pageToken: string | undefined;

    do {
      const response = await withRetry(() =>
        this.gmail.users.history.list({
          userId: 'me',
          startHistoryId,
          pageToken,
          historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved']
        })
      );

      const history = response.data.history || [];

      for (const record of history) {
        if (record.messagesAdded) {
          result.messagesAdded.push(...record.messagesAdded);
        }
        if (record.messagesDeleted) {
          result.messagesDeleted.push(...record.messagesDeleted);
        }
        if (record.labelsAdded) {
          result.labelsAdded.push(...record.labelsAdded);
        }
        if (record.labelsRemoved) {
          result.labelsRemoved.push(...record.labelsRemoved);
        }
      }

      if (response.data.historyId) {
        result.newHistoryId = response.data.historyId;
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return result;
  }

  private async performFullSync(): Promise<SyncResult> {
    const result: SyncResult = {
      messagesAdded: [],
      messagesDeleted: [],
      labelsAdded: [],
      labelsRemoved: [],
      newHistoryId: ''
    };

    for await (const page of this.listMessages()) {
      for (const message of page) {
        result.messagesAdded.push({ message });
      }
    }

    result.newHistoryId = await this.getCurrentHistoryId();

    return result;
  }

  // Abstract methods for persistence
  protected abstract saveRefreshToken(token: string): Promise<void>;
}
```

### Utility Functions

```typescript
// Decode base64url encoded message body
export function decodeBase64Url(data: string): string {
  // Replace URL-safe characters
  const base64 = data
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // Add padding if needed
  const padLength = 4 - (base64.length % 4);
  const padded = padLength === 4 ? base64 : base64 + '='.repeat(padLength);

  return Buffer.from(padded, 'base64').toString('utf-8');
}

// Extract plain text body from message
export function getTextBody(
  message: gmail_v1.Schema$Message
): string | undefined {
  const parts = message.payload?.parts || [message.payload];

  for (const part of parts) {
    if (part?.mimeType === 'text/plain' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }

  return undefined;
}

// Extract HTML body from message
export function getHtmlBody(
  message: gmail_v1.Schema$Message
): string | undefined {
  const parts = message.payload?.parts || [message.payload];

  for (const part of parts) {
    if (part?.mimeType === 'text/html' && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }

  return undefined;
}

// Recursively find all parts of a specific MIME type
export function findPartsByMimeType(
  message: gmail_v1.Schema$Message,
  mimeType: string
): gmail_v1.Schema$MessagePart[] {
  const results: gmail_v1.Schema$MessagePart[] = [];

  function searchParts(parts: gmail_v1.Schema$MessagePart[] | undefined) {
    if (!parts) return;

    for (const part of parts) {
      if (part.mimeType === mimeType) {
        results.push(part);
      }
      if (part.parts) {
        searchParts(part.parts);
      }
    }
  }

  searchParts(message.payload?.parts);
  return results;
}

// Parse email address from "Name <email@domain.com>" format
export function parseEmailAddress(
  address: string
): { name?: string; email: string } {
  const match = address.match(/^(?:(.*?)\s*)?<?([^>]+)>?$/);
  if (match) {
    return {
      name: match[1]?.trim() || undefined,
      email: match[2].trim()
    };
  }
  return { email: address.trim() };
}
```

---

## Sources

- [Google APIs Node.js Client](https://github.com/googleapis/google-api-nodejs-client)
- [Google Auth Library](https://googleapis.dev/nodejs/google-auth-library/latest/)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [Gmail API Batch Guide](https://developers.google.com/gmail/api/guides/batch)
- [Gmail API Quota](https://developers.google.com/gmail/api/reference/quota)
- [GMail API pagination use of nextPageToken - Stack Overflow](https://stackoverflow.com/questions/41797416/gmail-api-pagination-use-of-nextpagetoken)
- [Gmail API:Scope GMAIL_READONLY works, but not ... - Stack Overflow](https://stackoverflow.com/questions/28074075/gmail-apiscope-gmail-readonly-works-but-not-gmail-modify-why-is-that)
- [Fetching multiple Gmail messages using API batch request - LateNode Community](https://community.latenode.com/t/fetching-multiple-gmail-messages-using-api-batch-request/11193)
- ["500 Backend Error" using Gmail API - safe to retry? - Stack Overflow](https://stackoverflow.com/questions/43625472/500-backend-error-using-gmail-api-safe-to-retry)
- [Getting a users mailbox current history Id - Stack Overflow](https://stackoverflow.com/questions/26267357/getting-a-users-mailbox-current-history-id)
