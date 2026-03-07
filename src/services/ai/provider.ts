import { GeminiProvider } from './gemini';
import { AnthropicProvider } from './anthropic';
import { OpenAiProvider } from './openai';
import type { EmailSummary } from '../../types';

/**
 * AI Provider Abstraction
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface EmailMetadata {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
}

export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number; // 0.0-1.0
  reasoning?: string;
}

export interface ClassifyEmailsRequest {
  filterDescription: string;
  emails: EmailMetadata[];
}

export interface ClassifyEmailsResponse {
  results: EmailClassification[];
}

export interface SummarizeEmailRequest {
  emailId: string;
  content: string;
}

export interface SummarizeEmailResponse {
  summary: EmailSummary;
}

export interface IAiProviderExtensions {
  summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse>;
}

export interface AiProviderConfig {
  provider: 'gemini' | 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens?: number;
}

export interface AiProvider {
  classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse>;
}

/**
 * Create an AI provider instance from configuration
 */
export function createAiProvider(config: AiProviderConfig): AiProvider {
  switch (config.provider) {
    case 'gemini':
      return new GeminiProvider(config);
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAiProvider(config);
    default:
      throw new Error(`Unsupported AI provider: ${(config as any).provider}`);
  }
}

/**
 * Map numeric confidence to discrete level
 */
export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
