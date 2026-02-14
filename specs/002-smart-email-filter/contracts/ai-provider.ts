/**
 * Contract: AI Provider Interface
 *
 * Defines the abstraction layer between the smart filter and AI services.
 * Implementations exist for Anthropic and OpenAI-compatible APIs.
 */

// --- Types ---

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Metadata sent to the AI for classification */
export interface EmailMetadata {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
}

/** Single email classification result from AI */
export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number; // 0.0–1.0
  reasoning?: string;
}

/** Batch classification request */
export interface ClassifyEmailsRequest {
  filterDescription: string;
  emails: EmailMetadata[];
}

/** Batch classification response */
export interface ClassifyEmailsResponse {
  results: EmailClassification[];
}

/** AI provider configuration */
export interface AiProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  /** Maximum context window size in tokens. Used to dynamically size batches. Default: 32000 */
  maxContextTokens?: number;
}

// --- Interface ---

/** AI provider abstraction for email classification */
export interface AiProvider {
  /**
   * Classify a batch of emails against a natural language filter description.
   *
   * @param request - Filter description and email metadata
   * @returns Classification results for each email
   * @throws AiProviderError on API failure
   */
  classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse>;
}

// --- Factory ---

/**
 * Create an AI provider instance from configuration.
 *
 * @param config - Provider configuration
 * @returns Configured AI provider
 * @throws ConfigurationError if provider type is unsupported
 */
export type CreateAiProvider = (config: AiProviderConfig) => AiProvider;

// --- Helper ---

/** Map numeric confidence to discrete level */
export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
