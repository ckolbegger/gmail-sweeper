/**
 * T012-T013: AI Provider interface and confidence level mapping
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * T012: Map numeric confidence to discrete confidence level
 * @param confidence - Numeric confidence score 0.0-1.0
 * @returns Confidence level: high (≥0.8), medium (≥0.5), low (<0.5)
 */
export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Email metadata for classification
 */
export interface EmailMetadata {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
}

/**
 * Result of classifying a single email
 */
export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  reasoning?: string;
}

/**
 * T013: AI Provider interface
 */
export interface AiProvider {
  /**
   * Classify emails against a filter description
   * @param filterDescription - Natural language filter description
   * @param emails - Array of email metadata to classify
   * @param signal - Optional abort signal
   * @returns Array of classification results
   */
  classifyEmails(
    filterDescription: string,
    emails: EmailMetadata[],
    signal?: AbortSignal
  ): Promise<EmailClassification[]>;
}

/**
 * T013: Factory to create AI provider based on config
 */
export function createAiProvider(config: {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens: number;
}): AiProvider {
  if (config.provider === 'anthropic') {
    return new StubAnthropicProvider(config);
  }
  if (config.provider === 'openai') {
    return new StubOpenAiProvider(config);
  }
  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

/**
 * Stub Anthropic provider - will be replaced in T025
 */
class StubAnthropicProvider implements AiProvider {
  constructor(
    private _config: { model: string; apiKey: string; maxContextTokens: number }
  ) {}

  async classifyEmails(
    _filterDescription: string,
    _emails: EmailMetadata[],
    _signal?: AbortSignal
  ): Promise<EmailClassification[]> {
    throw new Error('AnthropicProvider not yet implemented - T025');
  }
}

/**
 * Stub OpenAI provider - will be replaced in T026
 */
class StubOpenAiProvider implements AiProvider {
  constructor(
    private _config: { model: string; apiKey: string; baseUrl?: string; maxContextTokens: number }
  ) {}

  async classifyEmails(
    _filterDescription: string,
    _emails: EmailMetadata[],
    _signal?: AbortSignal
  ): Promise<EmailClassification[]> {
    throw new Error('OpenAiProvider not yet implemented - T026');
  }
}
