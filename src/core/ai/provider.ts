import { AnthropicProvider } from './anthropic.js';
import { OpenAiProvider } from './openai.js';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

export interface EmailMetadata {
  id: string;
  subject: string;
  sender: string;
  snippet: string;
}

export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  reasoning?: string;
}

export interface EmailSummaryResult {
  emailId: string;
  summary: string;
  actionItems: string[];
  generatedAt: Date;
}

export interface AiProvider {
  classifyEmails(
    filterDescription: string,
    emails: EmailMetadata[],
    signal?: AbortSignal
  ): Promise<EmailClassification[]>;

  generateSummary(
    emailId: string,
    subject: string,
    sender: string,
    body: string,
    signal?: AbortSignal
  ): Promise<EmailSummaryResult>;
}

export function createAiProvider(config: {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens: number;
}): AiProvider {
  if (config.provider === 'anthropic') {
    const anthropicConfig: {
      model: string;
      apiKey: string;
      maxContextTokens: number;
      baseUrl?: string;
    } = {
      model: config.model,
      apiKey: config.apiKey,
      maxContextTokens: config.maxContextTokens,
    };
    if (config.baseUrl) {
      anthropicConfig.baseUrl = config.baseUrl;
    }
    return new AnthropicProvider(anthropicConfig);
  }
  if (config.provider === 'openai') {
    const openaiConfig: {
      model: string;
      apiKey: string;
      maxContextTokens: number;
      baseUrl?: string;
    } = {
      model: config.model,
      apiKey: config.apiKey,
      maxContextTokens: config.maxContextTokens,
    };
    if (config.baseUrl) {
      openaiConfig.baseUrl = config.baseUrl;
    }
    return new OpenAiProvider(openaiConfig);
  }
  throw new Error(`Unsupported AI provider: ${config.provider}`);
}
