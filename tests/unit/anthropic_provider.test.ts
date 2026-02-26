import { readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { AnthropicProvider } from '@/adapters/ai/anthropic.js';
import { AiProviderError } from '@/core/errors.js';

interface AnthropicClientMock {
  messages: {
    create: ReturnType<typeof vi.fn>;
  };
}

function createProvider(create: ReturnType<typeof vi.fn>): AnthropicProvider {
  const Provider = AnthropicProvider as unknown as new (
    config: {
      provider: 'anthropic';
      model: string;
      apiKey: string;
      maxContextTokens: number;
    },
    deps: { client: AnthropicClientMock }
  ) => AnthropicProvider;

  return new Provider(
    {
      provider: 'anthropic',
      model: 'claude-sonnet-test',
      apiKey: 'test-key',
      maxContextTokens: 32000
    },
    {
      client: {
        messages: {
          create
        }
      }
    }
  );
}

describe('AnthropicProvider', () => {
  it('should classify emails and parse JSON results', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            results: [
              {
                emailId: 'msg-1',
                matches: true,
                confidence: 0.91,
                reasoning: 'Looks like a receipt'
              }
            ]
          })
        }
      ]
    });
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'online purchase receipts',
      emails: [
        {
          messageId: 'msg-1',
          subject: 'Order confirmation',
          sender: 'store@example.com',
          snippet: 'Thanks for your purchase'
        }
      ]
    });

    expect(response).toEqual({
      results: [
        {
          emailId: 'msg-1',
          matches: true,
          confidence: 0.91,
          reasoning: 'Looks like a receipt'
        }
      ]
    });
    expect(create).toHaveBeenCalledOnce();
  });

  it('should request larger output budget for larger batches', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '{"results":[]}'
        }
      ]
    });
    const provider = createProvider(create);

    const emails = Array.from({ length: 20 }, (_, index) => ({
      messageId: `msg-${index + 1}`,
      subject: `Subject ${index + 1}`,
      sender: 'sender@example.com',
      snippet: 'Snippet'
    }));

    await provider.classifyEmails({
      filterDescription: 'war updates',
      emails
    });

    expect(create).toHaveBeenCalledOnce();
    const request = create.mock.calls[0]?.[0] as { max_tokens?: number; system?: string };
    expect(request.max_tokens).toBeGreaterThan(1024);
    expect(request.max_tokens).toBeLessThanOrEqual(4096);
    expect(request.system).toContain('compact/minified JSON');
  });

  it('should throw AiProviderError for invalid JSON payloads', async () => {
    const logFile = join(tmpdir(), `anthropic-debug-${Date.now()}.log`);
    const previousLogFile = process.env.AI_DEBUG_LOG_FILE;
    process.env.AI_DEBUG_LOG_FILE = logFile;

    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'not-json'
        }
      ]
    });
    const provider = createProvider(create);

    try {
      await expect(
        provider.classifyEmails({
          filterDescription: 'anything',
          emails: [
            {
              messageId: 'msg-1',
              subject: 'Subject',
              sender: 'sender@example.com',
              snippet: 'Snippet'
            }
          ]
        })
      ).rejects.toMatchObject(
        ({
          message: expect.stringContaining('Invalid'),
          details: {
            payloadPreview: expect.stringContaining('not-json'),
            debugLogFile: logFile
          }
        } satisfies Partial<AiProviderError>)
      );

      const debugOutput = readFileSync(logFile, 'utf8');
      expect(debugOutput).toContain('invalid-json-response');
      expect(debugOutput).toContain('not-json');
    } finally {
      if (previousLogFile === undefined) {
        delete process.env.AI_DEBUG_LOG_FILE;
      } else {
        process.env.AI_DEBUG_LOG_FILE = previousLogFile;
      }

      rmSync(logFile, { force: true });
    }
  });

  it('should short-circuit empty email batches', async () => {
    const create = vi.fn();
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'anything',
      emails: []
    });

    expect(response).toEqual({ results: [] });
    expect(create).not.toHaveBeenCalled();
  });

  it('should parse JSON wrapped in markdown code fences', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: [
            '```json',
            '{"results":[{"emailId":"msg-9","matches":true,"confidence":0.88}]}',
            '```'
          ].join('\n')
        }
      ]
    });
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'event invitations',
      emails: [
        {
          messageId: 'msg-9',
          subject: 'Invite',
          sender: 'events@example.com',
          snippet: 'Join us'
        }
      ]
    });

    expect(response).toEqual({
      results: [{ emailId: 'msg-9', matches: true, confidence: 0.88, reasoning: undefined }]
    });
  });

  it('should parse JSON when model includes extra prose around it', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: [
            'Here is the classification result:',
            '{"results":[{"emailId":"msg-2","matches":false,"confidence":0.22}]}',
            'Done.'
          ].join('\n')
        }
      ]
    });
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'receipts',
      emails: [
        {
          messageId: 'msg-2',
          subject: 'Subject',
          sender: 'sender@example.com',
          snippet: 'Snippet'
        }
      ]
    });

    expect(response).toEqual({
      results: [{ emailId: 'msg-2', matches: false, confidence: 0.22, reasoning: undefined }]
    });
  });

  it('should parse top-level JSON array payloads from model output', async () => {
    const create = vi.fn().mockResolvedValue({
      content: [
        {
          type: 'text',
          text: [
            'Classification output:',
            '[{"emailId":"msg-7","matches":true,"confidence":0.73}]',
            'End.'
          ].join('\n')
        }
      ]
    });
    const provider = createProvider(create);

    const response = await provider.classifyEmails({
      filterDescription: 'newsletters',
      emails: [
        {
          messageId: 'msg-7',
          subject: 'Weekly update',
          sender: 'newsletter@example.com',
          snippet: 'Latest news'
        }
      ]
    });

    expect(response).toEqual({
      results: [{ emailId: 'msg-7', matches: true, confidence: 0.73, reasoning: undefined }]
    });
  });
});
