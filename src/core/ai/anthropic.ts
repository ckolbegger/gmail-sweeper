/**
 * T018: Anthropic AI provider for email classification.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AiProvider,
  AiProviderConfig,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse,
} from './provider.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import { AiProviderError } from '../errors.js';

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;

  constructor(public readonly config: AiProviderConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    let response: Anthropic.Message;
    try {
      response = await this.client.messages.create({
        model: this.config.model,
        system: buildSystemPrompt(),
        messages: [
          { role: 'user', content: buildUserPrompt(request.filterDescription, request.emails) },
        ],
        max_tokens: 4096,
      });
    } catch (err) {
      const status = (err as { status?: number }).status;
      throw new AiProviderError(
        `Anthropic API error: ${(err as Error).message}`,
        'anthropic',
        { ...(status !== undefined && { statusCode: status }), cause: err as Error },
      );
    }

    const textBlock = response.content.find((block) => block.type === 'text');
    const rawText = textBlock && 'text' in textBlock ? textBlock.text : '';

    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const text = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const preview = rawText.length > 200 ? rawText.slice(0, 200) + '…' : rawText;
      throw new AiProviderError(
        `Malformed JSON from Anthropic. Raw response:\n${preview}`,
        'anthropic',
      );
    }

    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as Record<string, unknown>).results)
    ) {
      const preview = text.length > 200 ? text.slice(0, 200) + '…' : text;
      throw new AiProviderError(
        `Malformed response from Anthropic: missing results array. Parsed:\n${preview}`,
        'anthropic',
      );
    }

    return parsed as ClassifyEmailsResponse;
  }
}
