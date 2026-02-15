import { AiProvider, ClassifyEmailsRequest, ClassifyEmailsResponse, AiProviderConfig } from './provider';
import Anthropic from '@anthropic-ai/sdk';
import { buildClassificationPrompt } from './prompt';

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;

  constructor(private config: AiProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl
    });
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

    const message = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (message.content[0] as any).text;

    try {
      const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;
      
      return JSON.parse(jsonStr) as ClassifyEmailsResponse;
    } catch (error) {
      throw new Error(`Failed to parse Anthropic response as JSON: ${text}`);
    }
  }
}
