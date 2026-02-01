/**
 * Natural Language Query Engine Contract
 *
 * Defines the interface for processing natural language queries against emails.
 * The implementation uses Ollama with a local LLM (qwen2.5:7b) for semantic
 * understanding and email classification.
 */

import type { Email, EmailFilter, PaginatedResult, PaginationParams, Query, QueryResult } from './types';

// ============================================================================
// Query Engine
// ============================================================================

export interface NLQueryEngine {
  /**
   * Execute a natural language query against the email database.
   *
   * @param query - The natural language query text
   * @param options - Query options including filters and pagination
   * @returns Matching emails with relevance scores
   */
  executeQuery(
    query: string,
    options?: QueryExecutionOptions
  ): Promise<QueryExecutionResult>;

  /**
   * Explain how a query would be interpreted.
   * Useful for debugging and user feedback.
   */
  explainQuery(query: string): Promise<QueryExplanation>;

  /**
   * Check if the LLM service is available.
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get engine configuration and status.
   */
  getStatus(): Promise<QueryEngineStatus>;
}

// ============================================================================
// Query Execution
// ============================================================================

export interface QueryExecutionOptions extends PaginationParams {
  /** Optional filter to apply before NL matching */
  preFilter?: EmailFilter;

  /** Minimum relevance score (0-1) for results */
  minRelevance?: number;

  /** Maximum number of emails to analyze (default: 1000) */
  maxEmailsToAnalyze?: number;

  /** Whether to use cache for similar queries */
  useCache?: boolean;
}

export interface QueryExecutionResult extends PaginatedResult<ScoredEmail> {
  /** The interpreted query intent */
  interpretedIntent: string;

  /** Time taken to execute query in milliseconds */
  executionTimeMs: number;

  /** Whether results were served from cache */
  cached: boolean;

  /** Confidence score for the interpretation (0-1) */
  interpretationConfidence: number;
}

export interface ScoredEmail {
  email: Email;

  /** Relevance score (0-1, higher is better match) */
  relevanceScore: number;

  /** Explanation of why this email matched */
  matchExplanation: string;
}

// ============================================================================
// Query Explanation
// ============================================================================

export interface QueryExplanation {
  /** Original query text */
  originalQuery: string;

  /** What the system understood the user to be asking for */
  interpretedIntent: string;

  /** Keywords extracted from the query */
  extractedKeywords: string[];

  /** Categories the query might relate to */
  possibleCategories: string[];

  /** Example emails that would match */
  exampleMatches: string[];

  /** Confidence in interpretation (0-1) */
  confidence: number;
}

// ============================================================================
// Query Engine Status
// ============================================================================

export interface QueryEngineStatus {
  /** Whether the LLM service is running */
  isAvailable: boolean;

  /** Model being used */
  model: string;

  /** Model version/tag */
  modelVersion: string;

  /** Average response time from recent queries */
  averageResponseTimeMs: number;

  /** Number of queries processed this session */
  queriesProcessed: number;

  /** Cache hit rate (0-1) */
  cacheHitRate: number;
}

// ============================================================================
// Query Management (Persistence)
// ============================================================================

export interface QueryRepository {
  /** Save a new query */
  create(query: CreateQueryInput): Promise<Query>;

  /** Get a query by ID */
  getById(id: string): Promise<Query | null>;

  /** Get all saved queries */
  getAll(): Promise<Query[]>;

  /** Update an existing query */
  update(id: string, updates: UpdateQueryInput): Promise<Query>;

  /** Delete a query */
  delete(id: string): Promise<void>;

  /** Increment run count and update lastRunAt */
  recordExecution(id: string): Promise<void>;
}

export interface CreateQueryInput {
  name: string;
  naturalLanguageText: string;
  description?: string;
}

export interface UpdateQueryInput {
  name?: string;
  naturalLanguageText?: string;
  description?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface NLQueryEngineConfig {
  /** Ollama server URL (default: http://localhost:11434) */
  ollamaUrl: string;

  /** Model to use (default: qwen2.5:7b) */
  model: string;

  /** System prompt for email classification */
  systemPrompt?: string;

  /** Timeout for LLM requests in milliseconds (default: 10000) */
  timeoutMs: number;

  /** Temperature for generation (0-1, default: 0.3) */
  temperature: number;

  /** Enable query result caching */
  enableCache: boolean;

  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtlMs: number;
}

// Default configuration optimized for email classification
export const DEFAULT_NL_CONFIG: NLQueryEngineConfig = {
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b',
  timeoutMs: 10000,
  temperature: 0.3,
  enableCache: true,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
};

// Default system prompt for email classification
export const DEFAULT_SYSTEM_PROMPT = `You are an email classification assistant. Your task is to analyze emails and determine if they match the user's query.

Respond with a JSON object:
{
  "relevanceScore": 0.0-1.0,
  "matchExplanation": "brief explanation of why this matches or doesn't match"
}

Consider:
- Subject line content
- Sender information
- Email body content
- Any labels or categories
- The intent behind the user's natural language query

Be precise and concise in your explanations.`;

// ============================================================================
// Error Types
// ============================================================================

export type NLQueryErrorCode =
  | 'LLM_UNAVAILABLE'
  | 'LLM_TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'QUERY_TOO_LONG'
  | 'NO_EMAILS_TO_SEARCH'
  | 'UNKNOWN';

export class NLQueryError extends Error {
  constructor(
    public readonly code: NLQueryErrorCode,
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'NLQueryError';
  }
}
