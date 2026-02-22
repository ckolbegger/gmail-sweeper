/**
 * AI Provider abstraction layer for email classification
 * Supports Anthropic and OpenAI-compatible APIs
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { buildClassificationPrompt } from './prompt.js';
import { AiProviderError } from '../errors/index.js';

// --- Types ---

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Metadata sent to the AI for classification */
export interface EmailMetadata {
  id: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  snippet: string;
}

/** Single email classification result from AI */
export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number; // 0.0–1.0
  reasoning?: string;
}

/** Batch classification request */
export interface ClassifyEmailsRequest {
  filterDescription: string;
  emails: EmailMetadata[];
}

/** Batch classification response */
export interface ClassifyEmailsResponse {
  results: EmailClassification[];
}

/** AI provider configuration */
export interface AiProviderConfig {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxContextTokens?: number;
}

// --- Interface ---

/** AI provider abstraction for email classification */
export interface AiProvider {
  /**
   * Classify a batch of emails against a natural language filter description.
   *
   * @param filterDescription - Natural language filter description
   * @param emails - Array of email metadata to classify
   * @returns Classification results for each email
   */
  classifyEmails(filterDescription: string, emails: EmailMetadata[]): Promise<EmailClassification[]>;
}

// --- Factory ---

/**
 * Create an AI provider instance from configuration.
 *
 * @param config - Provider configuration
 * @param client - Optional pre-configured client for testing (dependency injection)
 * @returns Configured AI provider
 * @throws Error if provider type is unsupported
 */
export function createAiProvider(config: AiProviderConfig, client?: AnthropicClient | OpenAiClient): AiProvider {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider(config, client as AnthropicClient | undefined);
    case 'openai':
      return new OpenAiProvider(config, client as OpenAiClient | undefined);
    default:
      throw new Error(`Unsupported AI provider: ${config.provider as string}`);
  }
}

// --- Implementations ---

/** Anthropic client interface for dependency injection */
export interface AnthropicClient {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
    }) => Promise<{ content: Array<{ type: string; text?: string }> }>;
  };
}

/** Anthropic Claude API provider */
class AnthropicProvider implements AiProvider {
  private readonly client: AnthropicClient;
  private readonly model: string;

  constructor(
    config: AiProviderConfig,
    client?: AnthropicClient
  ) {
    if (client) {
      this.client = client;
    } else {
      this.client = new Anthropic({ apiKey: config.apiKey });
    }
    this.model = config.model ?? 'claude-sonnet-4-20250514';
  }

  async classifyEmails(filterDescription: string, emails: EmailMetadata[]): Promise<EmailClassification[]> {
    const { system, user } = buildClassificationPrompt(filterDescription, emails);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system,
        messages: [{ role: 'user', content: user }],
      });

      // Extract text from response
      const textBlock = response.content.find((block) => block.type === 'text');
      if (!textBlock || textBlock.type !== 'text' || !textBlock.text) {
        throw new AiProviderError('No text content in Anthropic response');
      }

      const text = textBlock.text;
      return this.parseResponse(text);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown Anthropic API error';
      throw new AiProviderError(`Anthropic API error: ${message}`);
    }
  }

  private parseResponse(text: string): EmailClassification[] {
    if (!text || text.trim() === '') {
      throw new AiProviderError('Empty response from Anthropic');
    }

    // Strip markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new AiProviderError('Failed to parse Anthropic response as JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new AiProviderError('Anthropic response is not a JSON array');
    }

    // Validate each classification object
    return parsed.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new AiProviderError(`Invalid classification object at index ${index}`);
      }

      const obj = item as Record<string, unknown>;

      if (typeof obj.emailId !== 'string') {
        throw new AiProviderError(`Missing or invalid emailId at index ${index}`);
      }
      if (typeof obj.matches !== 'boolean') {
        throw new AiProviderError(`Missing or invalid matches at index ${index}`);
      }
      if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
        throw new AiProviderError(`Missing or invalid confidence at index ${index}`);
      }

      const classification: EmailClassification = {
        emailId: obj.emailId,
        matches: obj.matches,
        confidence: obj.confidence,
      };

      if (typeof obj.reasoning === 'string') {
        classification.reasoning = obj.reasoning;
      }

      return classification;
    });
  }
}

/** OpenAI client interface for dependency injection */
export interface OpenAiClient {
  chat: {
    completions: {
      create: (params: {
        model: string;
        messages: Array<{ role: 'system' | 'user'; content: string }>;
        max_tokens: number;
      }) => Promise<{ choices: Array<{ message?: { content?: string | null } }> }>;
    };
  };
}

/** OpenAI-compatible API provider */
class OpenAiProvider implements AiProvider {
  private readonly client: OpenAiClient;
  private readonly model: string;

  constructor(
    config: AiProviderConfig,
    client?: OpenAiClient
  ) {
    if (client) {
      this.client = client;
    } else {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl,
      });
    }
    this.model = config.model ?? 'gpt-4o';
  }

  async classifyEmails(filterDescription: string, emails: EmailMetadata[]): Promise<EmailClassification[]> {
    const { system, user } = buildClassificationPrompt(filterDescription, emails);

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new AiProviderError('No content in OpenAI response');
      }

      return this.parseResponse(content);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : 'Unknown OpenAI API error';
      throw new AiProviderError(`OpenAI API error: ${message}`);
    }
  }

  private parseResponse(text: string): EmailClassification[] {
    if (!text || text.trim() === '') {
      throw new AiProviderError('Empty response from OpenAI');
    }

    // Strip markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new AiProviderError('Failed to parse OpenAI response as JSON');
    }

    if (!Array.isArray(parsed)) {
      throw new AiProviderError('OpenAI response is not a JSON array');
    }

    // Validate each classification object
    return parsed.map((item, index) => {
      if (typeof item !== 'object' || item === null) {
        throw new AiProviderError(`Invalid classification object at index ${index}`);
      }

      const obj = item as Record<string, unknown>;

      if (typeof obj.emailId !== 'string') {
        throw new AiProviderError(`Missing or invalid emailId at index ${index}`);
      }
      if (typeof obj.matches !== 'boolean') {
        throw new AiProviderError(`Missing or invalid matches at index ${index}`);
      }
      if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 1) {
        throw new AiProviderError(`Missing or invalid confidence at index ${index}`);
      }

      const classification: EmailClassification = {
        emailId: obj.emailId,
        matches: obj.matches,
        confidence: obj.confidence,
      };

      if (typeof obj.reasoning === 'string') {
        classification.reasoning = obj.reasoning;
      }

      return classification;
    });
  }
}

// --- Helper ---

/**
 * Convert a numeric confidence score to a categorical level.
 *
 * @param confidence - Number between 0 and 1
 * @returns 'high' if confidence >= 0.8, 'medium' if >= 0.5, 'low' otherwise
 */
export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
