# Core Library API Contract

**Date**: 2026-02-01 | **Branch**: `claude`

## Overview

This document defines the public API of the `src/core/` library. The TUI and web app consume this API. No business logic exists outside `core/`.

---

## Module: core/gmail

Gmail API integration layer.

### GmailClient

```typescript
import { Email, Label, EmailAddress } from '../models';

interface MessageListOptions {
  query?: string;              // Gmail search query
  maxResults?: number;         // Max messages to return (default 50)
  pageToken?: string;          // Token for next page (pagination)
  labels?: string[];           // Filter by label IDs (default: ['INBOX'])
}

interface MessageListResult {
  messages: Email[];
  nextPageToken?: string;
  totalEstimate: number;
}

interface BatchResult {
  succeeded: string[];         // message IDs
  failed: Array<{ id: string; error: string }>;
}

class GmailClient {
  /**
   * Initialize Gmail client.
   * @param account - Gmail account email address
   * @param credentialsPath - Path to OAuth credentials directory
   * @throws AuthenticationError if OAuth flow fails or tokens invalid
   */
  constructor(account: string, credentialsPath: string);

  /**
   * Perform OAuth2 authentication flow.
   * Opens browser for user consent if no valid tokens.
   * @returns true if authenticated successfully
   * @throws AuthenticationError if authentication fails
   */
  authenticate(): Promise<boolean>;

  /**
   * List messages from inbox with optional filtering.
   * @throws GmailAPIError on API failure after retries
   * @throws RateLimitError if rate limit exceeded after backoff
   */
  listMessages(options?: MessageListOptions): Promise<MessageListResult>;

  /**
   * Get full message details.
   * @param messageId - Gmail message ID
   * @param format - "full", "metadata", or "minimal"
   * @throws NotFoundError if message doesn't exist
   * @throws GmailAPIError on API failure
   */
  getMessage(messageId: string, format?: 'full' | 'metadata' | 'minimal'): Promise<Email>;

  /**
   * Add or remove labels from messages.
   * @throws GmailAPIError on API failure
   */
  modifyLabels(
    messageIds: string[],
    options: { addLabels?: string[]; removeLabels?: string[] }
  ): Promise<BatchResult>;

  /**
   * Archive messages (remove INBOX label).
   */
  archive(messageIds: string[]): Promise<BatchResult>;

  /**
   * Move messages to trash.
   */
  trash(messageIds: string[]): Promise<BatchResult>;

  /**
   * Get all labels for the account.
   */
  listLabels(): Promise<Label[]>;
}
```

---

## Module: core/search

Natural language search engine.

### EmailClassifier (Interface)

```typescript
import { Email, ClassificationResult } from '../models';

/**
 * Interface for email classification implementations.
 * Implementations: ClaudeClassifier, GeminiClassifier
 */
interface EmailClassifier {
  /**
   * Classify emails against a natural language query.
   * @param query - Natural language search query
   * @param emails - Emails to classify
   * @returns Classification results for each email
   */
  classify(query: string, emails: Email[]): Promise<ClassificationResult[]>;
}
```

### ClaudeClassifier

```typescript
class ClaudeClassifier implements EmailClassifier {
  /**
   * @param apiKey - Anthropic API key
   * @param model - Model to use (default: "claude-3-haiku-20240307")
   */
  constructor(apiKey: string, model?: string);

  classify(query: string, emails: Email[]): Promise<ClassificationResult[]>;
}
```

### GeminiClassifier

```typescript
class GeminiClassifier implements EmailClassifier {
  /**
   * @param apiKey - Google AI API key
   * @param model - Model to use (default: "gemini-1.5-flash")
   */
  constructor(apiKey: string, model?: string);

  classify(query: string, emails: Email[]): Promise<ClassificationResult[]>;
}
```

### SearchEngine

```typescript
import { GmailClient } from '../gmail';
import { Email } from '../models';

interface SearchResult {
  query: string;
  matches: Email[];
  totalScanned: number;
  durationMs: number;
}

interface SearchCache {
  get(queryHash: string): Promise<string[] | null>;  // cached email IDs
  set(queryHash: string, emailIds: string[], ttlMs: number): Promise<void>;
}

class SearchEngine {
  /**
   * Orchestrates email search with classification.
   */
  constructor(
    gmailClient: GmailClient,
    classifier: EmailClassifier,
    cache?: SearchCache
  );

  /**
   * Search emails using natural language query.
   * @param query - Natural language query (e.g., "find financial offers")
   * @param maxResults - Maximum results to return
   * @throws ClassificationError if LLM classification fails
   */
  search(query: string, maxResults?: number): Promise<SearchResult>;
}
```

---

## Module: core/actions

Email action operations.

### ActionExecutor

```typescript
import { GmailClient } from '../gmail';
import { Action } from '../models';

interface ActionResult {
  action: string;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Callback to get user confirmation for destructive actions.
 * @param message - Confirmation message to display
 * @returns true if user confirms, false otherwise
 */
type ConfirmationCallback = (message: string) => Promise<boolean>;

class ActionExecutor {
  /**
   * Executes actions on emails with confirmation.
   */
  constructor(gmailClient: GmailClient, confirmFn?: ConfirmationCallback);

  /**
   * Apply label to emails.
   * @param emailIds - Emails to label
   * @param labelId - Label to apply
   * @param skipConfirmation - Skip confirmation (default false per Constitution I)
   * @throws ConfirmationRequired if confirmation needed and not confirmed
   */
  applyLabel(
    emailIds: string[],
    labelId: string,
    skipConfirmation?: boolean
  ): Promise<ActionResult>;

  /**
   * Archive emails (remove from inbox).
   * @throws ConfirmationRequired if confirmation needed and not confirmed
   */
  archive(emailIds: string[], skipConfirmation?: boolean): Promise<ActionResult>;

  /**
   * Move emails to trash.
   * @throws ConfirmationRequired if confirmation needed and not confirmed
   */
  delete(emailIds: string[], skipConfirmation?: boolean): Promise<ActionResult>;

  /**
   * Execute a saved action.
   */
  executeAction(emailIds: string[], action: Action, skipConfirmation?: boolean): Promise<ActionResult>;
}
```

---

## Module: core/cache

Local SQLite caching layer.

### EmailCache

```typescript
import { Email, Category } from '../models';

interface EmailCacheOptions {
  limit?: number;
  offset?: number;
  sortBy?: 'date' | 'sender' | 'subject';
  sortDesc?: boolean;
  labelFilter?: string;
  categoryFilter?: Category;
}

class EmailCache {
  /**
   * SQLite-based email metadata cache.
   * @param dbPath - Path to SQLite database file
   */
  constructor(dbPath: string);

  /**
   * Initialize database schema.
   */
  initialize(): void;

  /**
   * Get cached emails with filtering/sorting.
   */
  getEmails(options?: EmailCacheOptions): Email[];

  /**
   * Insert or update cached emails.
   */
  upsertEmails(emails: Email[]): void;

  /**
   * Get last sync timestamp for account.
   */
  getLastSync(account: string): Date | null;

  /**
   * Update last sync timestamp.
   */
  setLastSync(account: string, timestamp: Date): void;

  /**
   * Clear all cached data.
   */
  clear(): void;
}
```

---

## Module: core/models

Domain models (see data-model.md for details).

```typescript
// Re-exported from core/models/index.ts

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  sender: EmailAddress;
  recipients: EmailAddress[];
  date: Date;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  labels: Label[];
  category?: Category;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface Label {
  id: string;
  name: string;
  type: LabelType;
  color?: string;
}

export type LabelType = 'system' | 'user';

export type Category = 'primary' | 'social' | 'promotions' | 'updates' | 'forums';

export interface ClassificationResult {
  emailId: string;
  matches: boolean;
  confidence: number;
  reasoning?: string;
}

export type Action =
  | { type: 'applyLabel'; labelId: string }
  | { type: 'archive' }
  | { type: 'delete' };

export interface SavedQuery {
  id: string;
  name: string;
  queryText: string;
  action?: Action;
  order: number;
  createdAt: Date;
  lastRun?: Date;
  lastRunCount: number;
}

export interface Config {
  gmailAccount: string;
  initialLoadSize: number;
  llmProvider: 'claude' | 'gemini';
  llmApiKeyEnv: string;
  theme: string;
  confirmDestructive: boolean;
}
```

---

## Exceptions

```typescript
export class GmailSweepError extends Error {
  constructor(message: string);
}

export class AuthenticationError extends GmailSweepError {
  /** OAuth authentication failed. */
}

export class GmailAPIError extends GmailSweepError {
  /** Gmail API returned an error. */
  statusCode?: number;
}

export class RateLimitError extends GmailAPIError {
  /** Rate limit exceeded after retries. */
  retryAfterMs?: number;
}

export class NotFoundError extends GmailAPIError {
  /** Resource not found. */
}

export class ClassificationError extends GmailSweepError {
  /** LLM classification failed. */
}

export class ConfirmationRequired extends GmailSweepError {
  /** Destructive action requires confirmation. */
  action: string;
  emailCount: number;
}
```

---

## Usage Example

```typescript
import { GmailClient } from './core/gmail';
import { SearchEngine, ClaudeClassifier } from './core/search';
import { ActionExecutor } from './core/actions';

// Initialize
const client = new GmailClient('user@gmail.com', '~/.config/gmail-sweep');
await client.authenticate();

const classifier = new ClaudeClassifier(process.env.ANTHROPIC_API_KEY!);
const search = new SearchEngine(client, classifier);
const actions = new ActionExecutor(client, async (msg) => {
  // TUI/web would show confirmation dialog
  return confirm(msg);
});

// Search for financial offers
const result = await search.search('find all financial offers');
console.log(`Found ${result.matches.length} matching emails`);

// Archive matching emails (with confirmation)
if (result.matches.length > 0) {
  const emailIds = result.matches.map(e => e.id);
  const outcome = await actions.archive(emailIds);
  console.log(`Archived ${outcome.succeeded} emails`);
}
```
