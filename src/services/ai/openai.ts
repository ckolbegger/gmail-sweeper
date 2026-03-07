import { AiProvider, ClassifyEmailsRequest, ClassifyEmailsResponse, AiProviderConfig, SummarizeEmailRequest, SummarizeEmailResponse } from './provider';
import OpenAI from 'openai';
import { buildClassificationPrompt } from './prompt';

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;

  constructor(private config: AiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
      dangerouslyAllowBrowser: true // if needed for testing, but typically not for node
    });
  }

  async summarizeEmail(request: SummarizeEmailRequest): Promise<SummarizeEmailResponse> {
    throw new Error("Method not implemented.");
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

    const completion = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' }
    });

    const text = completion.choices[0].message.content || '{}';

    try {
      return JSON.parse(text) as ClassifyEmailsResponse;
    } catch (error) {
      throw new Error(`Failed to parse OpenAI response as JSON: ${text}`);
    }
  }
}
