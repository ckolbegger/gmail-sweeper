/**
 * T025: Anthropic AI Provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AiProvider,
  EmailMetadata,
  EmailClassification,
  EmailSummaryResult,
} from './provider.js';
import { toConfidenceLevel } from './provider.js';
import { buildClassificationPrompt, buildSummaryPrompt } from './prompt.js';

export interface AnthropicConfig {
  model: string;
  apiKey: string;
  maxContextTokens: number;
  baseUrl?: string;
}

export class AnthropicProvider implements AiProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: AnthropicConfig) {
    const clientOptions: { apiKey: string; baseURL?: string } = {
      apiKey: config.apiKey,
    };
    if (config.baseUrl) {
      clientOptions.baseURL = config.baseUrl;
    }
    this.client = new Anthropic(clientOptions);
    this.model = config.model;
  }

  async classifyEmails(
    filterDescription: string,
    emails: EmailMetadata[],
    signal?: AbortSignal
  ): Promise<EmailClassification[]> {
    const prompt = buildClassificationPrompt(filterDescription, emails);

    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal }
    );

    // Find text content in response - may be in different blocks
    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent = block.text;
        break;
      }
    }

    if (!textContent) {
      // Check if response has thinking blocks
      const hasThinking = response.content.some((b: any) => b.type === 'thinking');
      if (hasThinking) {
        throw new Error('AI is thinking - try again with fewer emails or simpler query');
      }
      throw new Error('Invalid response from Anthropic API: no text content');
    }

    return this.parseResponse(textContent);
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

  async generateSummary(
    emailId: string,
    subject: string,
    sender: string,
    body: string,
    signal?: AbortSignal
  ): Promise<EmailSummaryResult> {
    const prompt = buildSummaryPrompt({ id: emailId, subject, sender, body });

    const response = await this.client.messages.create(
      {
        model: this.model,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      },
      { signal }
    );

    let textContent = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent = block.text;
        break;
      }
    }

    if (!textContent) {
      throw new Error('Invalid response from Anthropic API: no text content');
    }

    return this.parseSummaryResponse(emailId, textContent);
  }

  private parseSummaryResponse(emailId: string, text: string): EmailSummaryResult {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON response from AI');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);

      const summary = parsed.summary || '';
      const actionItems = Array.isArray(parsed.action_items) ? parsed.action_items : [];
      const generatedAt = parsed.generated_at ? new Date(parsed.generated_at) : new Date();

      return {
        emailId,
        summary,
        actionItems,
        generatedAt,
      };
    } catch (error) {
      throw new Error(
        `Failed to parse AI summary response: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }
  }
}
