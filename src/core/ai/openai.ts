/**
 * T026: OpenAI AI Provider implementation
 */

import OpenAI from 'openai';
import type { AiProvider, EmailMetadata, EmailClassification } from './provider.js';
import { toConfidenceLevel } from './provider.js';
import { buildClassificationPrompt } from './prompt.js';

export interface OpenAiConfig {
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens: number;
}

export class OpenAiProvider implements AiProvider {
  private client: OpenAI;
  private model: string;

  constructor(config: OpenAiConfig) {
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
    this.model = config.model;
  }

  async classifyEmails(
    filterDescription: string,
    emails: EmailMetadata[],
    signal?: AbortSignal
  ): Promise<EmailClassification[]> {
    const prompt = buildClassificationPrompt(filterDescription, emails);

    const controller = signal
      ? (() => {
          const c = new AbortController();
          signal.addEventListener('abort', () => c.abort());
          return c;
        })()
      : null;

    const response = await this.client.chat.completions.create(
      {
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      },
      { signal: controller?.signal as AbortSignal | undefined }
    );

    const message = response.choices[0]?.message;
    if (!message?.content) {
      throw new Error('Invalid response from OpenAI API');
    }

    return this.parseResponse(message.content);
  }

  private parseResponse(text: string): EmailClassification[] {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from AI');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.map(
        (item: {
          email_id?: string;
          emailId?: string;
          matches?: boolean;
          confidence?: number;
          reasoning?: string;
        }): EmailClassification => {
          const emailId = item.email_id || item.emailId;
          if (!emailId) {
            throw new Error('Response missing email_id');
          }
          const confidence = typeof item.confidence === 'number' ? item.confidence : 0.5;

          const result: EmailClassification = {
            emailId,
            matches: Boolean(item.matches),
            confidence,
            confidenceLevel: toConfidenceLevel(confidence),
          };
          if (item.reasoning) {
            result.reasoning = item.reasoning;
          }
          return result;
        }
      );
    } catch (error) {
      throw new Error(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }
  }
}
