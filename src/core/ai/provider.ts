import type { AiProviderConfig } from './config.js';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number;
  reasoning?: string;
}

export interface ClassificationRequest {
  filterDescription: string;
  emails: Array<{
    id: string;
    subject: string;
    sender: { name?: string; email: string };
    snippet: string;
  }>;
}

export interface AiProvider {
  classifyEmails(request: ClassificationRequest): Promise<EmailClassification[]>;
}

export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) {
    return 'high';
  }
  if (confidence >= 0.5) {
    return 'medium';
  }
  return 'low';
}

export function createAiProvider(config: AiProviderConfig): AiProvider {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config);
    case 'openai':
      return new OpenAiProvider(config);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider}`);
  }
}

class AnthropicProvider implements AiProvider {
  constructor(_config: AiProviderConfig) {}

  async classifyEmails(_request: ClassificationRequest): Promise<EmailClassification[]> {
    throw new Error('Not implemented');
  }
}

class OpenAiProvider implements AiProvider {
  constructor(_config: AiProviderConfig) {}

  async classifyEmails(_request: ClassificationRequest): Promise<EmailClassification[]> {
    throw new Error('Not implemented');
  }
}
