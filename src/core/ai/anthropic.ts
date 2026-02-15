import Anthropic from '@anthropic-ai/sdk';
import type { AiProviderConfig } from './config.js';
import type { AiProvider, ClassificationRequest, EmailClassification } from './provider.js';
import { buildClassificationPrompt } from './prompt.js';
import { AiProviderError } from '../errors/index.js';

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: AiProviderConfig) {
    this.model = config.model;
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async classifyEmails(request: ClassificationRequest): Promise<EmailClassification[]> {
    try {
      const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: prompt.system,
        messages: [
          {
            role: 'user',
            content: prompt.user,
          },
        ],
      });

      // Extract text content from response
      const textContent = response.content.find((block: { type: string }) => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new AiProviderError('INVALID_RESPONSE', 'No text content in API response');
      }

      const responseText = textContent.text.trim();
      if (!responseText) {
        throw new AiProviderError('INVALID_RESPONSE', 'Empty response from API');
      }

      // Parse JSON response
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

      // Validate response is an array
      if (!Array.isArray(classifications)) {
        throw new AiProviderError('INVALID_RESPONSE', 'API response is not an array');
      }

      // Validate each classification has required fields
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
      // Re-throw AiProviderError as-is
      if (error instanceof AiProviderError) {
        throw error;
      }

      // Wrap other errors
      throw new AiProviderError(
        'API_ERROR',
        `Anthropic API error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }
}
