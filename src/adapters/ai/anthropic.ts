import { appendFileSync } from 'node:fs';

import Anthropic from '@anthropic-ai/sdk';

import { buildClassificationPrompt } from '@/adapters/ai/prompt.js';
import type {
  AiProvider,
  AiProviderConfig,
  EmailClassification,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse
} from '@/adapters/ai/provider.js';
import { AiProviderError } from '@/core/errors.js';

interface AnthropicTextBlock {
  text?: string;
}

interface AnthropicMessageResponse {
  content?: AnthropicTextBlock[];
}

interface AnthropicClientLike {
  messages: {
    create: (input: {
      model: string;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
      max_tokens: number;
      temperature: number;
    }) => Promise<AnthropicMessageResponse>;
  };
}

interface AnthropicProviderDeps {
  client?: AnthropicClientLike;
}

const DEFAULT_DEBUG_LOG_FILE = 'debug.log';
const MIN_RESPONSE_TOKENS = 1024;
const MAX_RESPONSE_TOKENS = 4096;

function createPayloadPreview(payload: string, maxChars = 1000): string {
  return payload.length <= maxChars
    ? payload
    : `${payload.slice(0, maxChars)}... [truncated ${payload.length - maxChars} chars]`;
}

function appendDebugLog(reason: string, payload: string): string | undefined {
  const logFile = process.env.AI_DEBUG_LOG_FILE?.trim() || DEFAULT_DEBUG_LOG_FILE;
  const timestamp = new Date().toISOString();
  const entry = [
    `\n[${timestamp}] anthropic ${reason}`,
    payload,
    ''
  ].join('\n');

  try {
    appendFileSync(logFile, entry, 'utf8');
    return logFile;
  } catch {
    return undefined;
  }
}

function estimateResponseTokens(emailCount: number): number {
  // Per-entry budget for compact JSON with occasional reasoning text.
  const estimate = 256 + emailCount * 160;
  return Math.min(MAX_RESPONSE_TOKENS, Math.max(MIN_RESPONSE_TOKENS, estimate));
}

function extractJsonCandidates(payload: string): string[] {
  const candidates: string[] = [];
  const trimmed = payload.trim();

  if (trimmed.length > 0) {
    candidates.push(trimmed);
  }

  const fencedMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)];
  for (const match of fencedMatches) {
    const candidate = (match[1] ?? '').trim();
    if (candidate.length > 0) {
      candidates.push(candidate);
    }
  }

  const extractBalancedSegments = (openChar: string, closeChar: string): void => {
    let inString = false;
    let escaped = false;
    let depth = 0;
    let startIndex = -1;

    for (let index = 0; index < trimmed.length; index += 1) {
      const char = trimmed[index];
      if (!char) {
        continue;
      }

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\') {
          escaped = true;
          continue;
        }

        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === openChar) {
        if (depth === 0) {
          startIndex = index;
        }
        depth += 1;
        continue;
      }

      if (char === closeChar && depth > 0) {
        depth -= 1;
        if (depth === 0 && startIndex >= 0) {
          candidates.push(trimmed.slice(startIndex, index + 1).trim());
          startIndex = -1;
        }
      }
    }
  };

  extractBalancedSegments('{', '}');
  extractBalancedSegments('[', ']');

  const objectStart = trimmed.indexOf('{');
  const objectEnd = trimmed.lastIndexOf('}');
  if (objectStart >= 0 && objectEnd > objectStart) {
    candidates.push(trimmed.slice(objectStart, objectEnd + 1).trim());
  }

  const arrayStart = trimmed.indexOf('[');
  const arrayEnd = trimmed.lastIndexOf(']');
  if (arrayStart >= 0 && arrayEnd > arrayStart) {
    candidates.push(trimmed.slice(arrayStart, arrayEnd + 1).trim());
  }

  return [...new Set(candidates)];
}

function parseCandidate(candidate: string): EmailClassification[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { results?: unknown }).results)
      ? (parsed as { results: unknown[] }).results
      : null;

  if (!entries) {
    return null;
  }

  return entries.map((entry) => {
    if (!entry || typeof entry !== 'object') {
      throw new AiProviderError('Invalid classification item from Anthropic provider');
    }

    const item = entry as Partial<EmailClassification>;
    if (typeof item.emailId !== 'string') {
      throw new AiProviderError('Invalid classification emailId from Anthropic provider');
    }
    if (typeof item.matches !== 'boolean') {
      throw new AiProviderError('Invalid classification matches flag from Anthropic provider');
    }
    if (typeof item.confidence !== 'number' || Number.isNaN(item.confidence)) {
      throw new AiProviderError('Invalid classification confidence from Anthropic provider');
    }

    return {
      emailId: item.emailId,
      matches: item.matches,
      confidence: item.confidence,
      reasoning: typeof item.reasoning === 'string' ? item.reasoning : undefined
    };
  });
}

function maybeLogRawResponse(payload: string): void {
  if (process.env.AI_DEBUG_RESPONSES !== '1') {
    return;
  }

  appendDebugLog('raw-response', payload);
  // eslint-disable-next-line no-console
  console.error(`[ai-debug][anthropic] Raw response payload:\n${payload}`);
}

function parseResults(payload: string): EmailClassification[] {
  maybeLogRawResponse(payload);
  const candidates = extractJsonCandidates(payload);

  for (const candidate of candidates) {
    const parsed = parseCandidate(candidate);
    if (parsed) {
      return parsed;
    }
  }

  const debugLogFile = appendDebugLog('invalid-json-response', payload);
  throw new AiProviderError('Invalid JSON response from Anthropic provider', {
    payloadPreview: createPayloadPreview(payload),
    debugLogFile
  });
}

function createAnthropicClient(config: AiProviderConfig): AnthropicClientLike {
  return new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl
  }) as unknown as AnthropicClientLike;
}

export class AnthropicProvider implements AiProvider {
  public readonly config: AiProviderConfig;
  private readonly client: AnthropicClientLike;

  constructor(config: AiProviderConfig, deps: AnthropicProviderDeps = {}) {
    this.config = config;
    this.client = deps.client ?? createAnthropicClient(config);
  }

  async classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse> {
    if (request.emails.length === 0) {
      return { results: [] };
    }

    const prompt = buildClassificationPrompt(request.filterDescription, request.emails);
    const compactJsonSystemPrompt = [
      prompt.system,
      'Use compact/minified JSON (no markdown fences, no prose).',
      'Only include reasoning when confidence is below 0.6 or matches is true.'
    ].join(' ');
    const maxTokens = estimateResponseTokens(request.emails.length);

    try {
      const response = await this.client.messages.create({
        model: this.config.model,
        system: compactJsonSystemPrompt,
        messages: [{ role: 'user', content: prompt.user }],
        max_tokens: maxTokens,
        temperature: 0
      });

      const payload = response.content?.map((chunk) => chunk.text ?? '').join('').trim() ?? '';
      if (payload.length === 0) {
        throw new AiProviderError('Invalid empty response from Anthropic provider');
      }

      return {
        results: parseResults(payload)
      };
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw error;
      }

      throw new AiProviderError('Failed to classify emails with Anthropic provider', {
        cause: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
