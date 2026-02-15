import OpenAI from 'openai';
import type { AiProviderConfig } from './config.js';
import type { AiProvider, ClassificationRequest, EmailClassification } from './provider.js';
import { buildClassificationPrompt } from './prompt.js';
import { AiProviderError } from '../errors/index.js';

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: AiProviderConfig) {
    this.model = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async classifyEmails(request: ClassificationRequest): Promise<EmailClassification[]> {
    try {
      const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: prompt.system,
          },
          {
            role: 'user',
            content: prompt.user,
          },
        ],
      });

      const messageContent = response.choices[0]?.message?.content;
      if (!messageContent) {
        throw new AiProviderError('INVALID_RESPONSE', 'No content in API response');
      }

      const responseText = messageContent.trim();
      if (!responseText) {
        throw new AiProviderError('INVALID_RESPONSE', 'Empty response from API');
      }

      let classifications: unknown;
      try {
        classifications = JSON.parse(responseText);
      } catch (error) {
        throw new AiProviderError(
          'INVALID_RESPONSE',
          'Failed to parse JSON response from API',
          error instanceof Error ? error : undefined
        );
      }

      if (!Array.isArray(classifications)) {
        throw new AiProviderError('INVALID_RESPONSE', 'API response is not an array');
      }

      const validated: EmailClassification[] = classifications.map((item: unknown) => {
        const obj = item as Record<string, unknown>;

        if (typeof obj.emailId !== 'string') {
          throw new AiProviderError(
            'INVALID_RESPONSE',
            'Missing or invalid emailId in classification'
          );
        }

        if (typeof obj.matches !== 'boolean') {
          throw new AiProviderError(
            'INVALID_RESPONSE',
            'Missing or invalid matches field in classification'
          );
        }

        if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
          throw new AiProviderError(
            'INVALID_RESPONSE',
            'Missing or invalid confidence field in classification'
          );
        }

        return {
          emailId: obj.emailId,
          matches: obj.matches,
          confidence: obj.confidence,
          reasoning: typeof obj.reasoning === 'string' ? obj.reasoning : undefined,
        };
      });

      return validated;
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      throw new AiProviderError(
        'API_ERROR',
        `OpenAI API error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}
