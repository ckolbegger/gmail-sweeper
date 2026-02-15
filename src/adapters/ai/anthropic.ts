import type {
  AiProvider,
  AiProviderConfig,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse
} from '@/adapters/ai/provider.js';
import { AiProviderError } from '@/core/errors.js';

export class AnthropicProvider implements AiProvider {
  public readonly config: AiProviderConfig;

  constructor(config: AiProviderConfig) {
    this.config = config;
  }

  async classifyEmails(_request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    throw new AiProviderError('AnthropicProvider classifyEmails is not implemented yet');
  }
}
