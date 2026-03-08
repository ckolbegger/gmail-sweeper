import { AnthropicProvider } from '@/adapters/ai/anthropic.js';
import { OpenAiProvider } from '@/adapters/ai/openai.js';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface EmailMetadata {
  messageId: string;
  subject: string;
  sender: string;
  snippet: string;
}

export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number;
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
  messageId: string;
  subject: string;
  sender: string;
  body: string;
}

export interface SummarizeEmailResponse {
  summarySentence: string;
  actionItems: string[];
}

export interface AiProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens: number;
}

export interface AiProvider {
  classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse>;
}

export interface SummaryProvider {
  summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse>;
}

export type FullAiProvider = AiProvider & SummaryProvider;

export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export function createAiProvider(config: AiProviderConfig): AiProvider {
  if (config.provider === 'anthropic') {
    return new AnthropicProvider(config);
  }

  if (config.provider === 'openai') {
    return new OpenAiProvider(config);
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

export function isSummaryProvider(provider: AiProvider | null | undefined): provider is FullAiProvider {
  return Boolean(provider && typeof (provider as Partial<SummaryProvider>).summarizeEmail === 'function');
}
