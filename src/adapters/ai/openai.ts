import OpenAI from 'openai';

import { buildClassificationPrompt } from '@/adapters/ai/prompt.js';
import type {
  AiProvider,
  AiProviderConfig,
  EmailClassification,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse
} from '@/adapters/ai/provider.js';
import { AiProviderError } from '@/core/errors.js';

interface OpenAiResponseOutputTextPart {
  text?: string;
}

interface OpenAiResponseOutputItem {
  content?: OpenAiResponseOutputTextPart[];
}

interface OpenAiResponse {
  output_text?: string;
  output?: OpenAiResponseOutputItem[];
}

interface OpenAiClientLike {
  responses: {
    create: (input: {
      model: string;
      temperature: number;
      input: Array<{ role: 'system' | 'user'; content: string }>;
    }) => Promise<OpenAiResponse>;
  };
}

interface OpenAiProviderDeps {
  client?: OpenAiClientLike;
}

function parseResults(payload: string): EmailClassification[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    throw new AiProviderError('Invalid JSON response from OpenAI provider');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { results?: unknown }).results)) {
    throw new AiProviderError('Invalid classification payload from OpenAI provider');
  }

  const results = (parsed as { results: unknown[] }).results;
  return results.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new AiProviderError('Invalid classification item from OpenAI provider');
    }

    const item = entry as Partial<EmailClassification>;
    if (typeof item.emailId !== 'string') {
      throw new AiProviderError('Invalid classification emailId from OpenAI provider');
    }
    if (typeof item.matches !== 'boolean') {
      throw new AiProviderError('Invalid classification matches flag from OpenAI provider');
    }
    if (typeof item.confidence !== 'number' || Number.isNaN(item.confidence)) {
      throw new AiProviderError('Invalid classification confidence from OpenAI provider');
    }

    return {
      emailId: item.emailId,
      matches: item.matches,
      confidence: item.confidence,
      reasoning: typeof item.reasoning === 'string' ? item.reasoning : undefined
    };
  });
}

function extractPayload(response: OpenAiResponse): string {
  if (typeof response.output_text === 'string' && response.output_text.trim().length > 0) {
    return response.output_text.trim();
  }

  const fromOutput = response.output
    ?.flatMap((item) => item.content ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  return fromOutput ?? '';
}

function createOpenAiClient(config: AiProviderConfig): OpenAiClientLike {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl
  }) as unknown as OpenAiClientLike;
}

export class OpenAiProvider implements AiProvider {
  public readonly config: AiProviderConfig;
  private readonly client: OpenAiClientLike;

  constructor(config: AiProviderConfig, deps: OpenAiProviderDeps = {}) {
    this.config = config;
    this.client = deps.client ?? createOpenAiClient(config);
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    if (request.emails.length === 0) {
      return { results: [] };
    }

    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);

    try {
      const response = await this.client.responses.create({
        model: this.config.model,
        temperature: 0,
        input: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ]
      });
      const payload = extractPayload(response);
      if (payload.length === 0) {
        throw new AiProviderError('Invalid empty response from OpenAI provider');
      }

      return {
        results: parseResults(payload)
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      throw new AiProviderError('Failed to classify emails with OpenAI provider', {
        cause: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
