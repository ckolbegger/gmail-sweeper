/**
 * AI provider types and helpers.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Map numeric confidence (0.0–1.0) to a discrete confidence level. */
export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

// --- Provider types ---

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
  confidence: number;
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
  maxContextTokens?: number;
}

/** AI provider abstraction for email classification */
export interface AiProvider {
  classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse>;
}

/** Anthropic AI provider */
export class AnthropicProvider implements AiProvider {
  constructor(public readonly config: AiProviderConfig) {}

  async classifyEmails(_request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    // TODO: implement with Anthropic SDK
    throw new Error('Not implemented');
  }
}

/** OpenAI-compatible AI provider */
export class OpenAiProvider implements AiProvider {
  constructor(public readonly config: AiProviderConfig) {}

  async classifyEmails(_request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    // TODO: implement with OpenAI SDK
    throw new Error('Not implemented');
  }
}

/** Create an AI provider instance from configuration. */
export function createAiProvider(config: AiProviderConfig): AiProvider {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAiProvider(config);
    default:
      throw new Error(`Unsupported AI provider: ${String(config.provider)}`);
  }
}
