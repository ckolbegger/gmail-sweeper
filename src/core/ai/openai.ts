/**
 * OpenAI-compatible AI provider for email classification.
 */

import OpenAI from 'openai';
import { AiProviderError } from '../errors.js';
import { buildSystemPrompt, buildUserPrompt } from './prompt.js';
import type {
  AiProvider,
  AiProviderConfig,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse,
} from './provider.js';

export class OpenAiProvider implements AiProvider {
  private readonly client: OpenAI;

  constructor(public readonly config: AiProviderConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    let response;
    try {
      response = await this.client.chat.completions.create({
        model: this.config.model,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(request.filterDescription, request.emails) },
        ],
      });
    } catch (err) {
      const status = (err as Record<string, unknown>).status as number | undefined;
      const options: { statusCode?: number; cause?: Error } = { cause: err as Error };
      if (status !== undefined) {
        options.statusCode = status;
      }
      throw new AiProviderError(
        `OpenAI API error: ${(err as Error).message}`,
        'openai',
        options,
      );
    }

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new AiProviderError('Empty response from OpenAI', 'openai');
    }

    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const content = rawContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      const preview = rawContent.length > 200 ? rawContent.slice(0, 200) + '…' : rawContent;
      throw new AiProviderError(
        `Malformed JSON from OpenAI. Raw response:\n${preview}`,
        'openai',
      );
    }

    const obj = parsed as Record<string, unknown>;
    if (!obj || !Array.isArray(obj.results)) {
      const preview = content.length > 200 ? content.slice(0, 200) + '…' : content;
      throw new AiProviderError(
        `Invalid response from OpenAI: missing results array. Parsed:\n${preview}`,
        'openai',
      );
    }

    return obj as unknown as ClassifyEmailsResponse;
  }
}
