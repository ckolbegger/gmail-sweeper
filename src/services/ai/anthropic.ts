import { AiProvider, ClassifyEmailsRequest, ClassifyEmailsResponse, AiProviderConfig } from './provider';

export class AnthropicProvider implements AiProvider {
  constructor(private config: AiProviderConfig) {}
  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    throw new Error('Method not implemented.');
  }
}
