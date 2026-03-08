import { AiProvider, ClassifyEmailsRequest, ClassifyEmailsResponse, AiProviderConfig, SummarizeEmailRequest, SummarizeEmailResponse } from './provider';
import Anthropic from '@anthropic-ai/sdk';
import { buildClassificationPrompt, buildSummaryPrompt } from './prompt';

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;

  constructor(private config: AiProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }

  async summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse> {
    const prompt = buildSummaryPrompt(request.content);

    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' }
      ],
    });

    const text = '{' + (message.content[0] as any).text;

    try {
      const parsed = JSON.parse(text);
      return {
        summary: {
          ...parsed.summary,
          emailId: request.emailId,
          createdAt: new Date().toISOString()
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse Anthropic response as JSON: ${text}`);
    }
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' }
      ],
    });

    const text = '{' + (message.content[0] as any).text;

    try {
      return JSON.parse(text) as ClassifyEmailsResponse;
    } catch (error) {
      throw new Error(`Failed to parse Anthropic response as JSON: ${text}`);
    }
  }
}
