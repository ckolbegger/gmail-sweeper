import { describe, expect, it, vi } from 'vitest';

import { createEmail } from '@/core/entities.js';
import { AiProviderError } from '@/core/errors.js';
import { runSmartFilter } from '@/services/smart_filter_service.js';

const EMAIL = createEmail({
  message_id: 'msg-1',
  received_at: Date.parse('2026-02-10T10:00:00Z'),
  subject: 'Edge case',
  sender: 'edge@example.com'
});

describe('smart filter edge cases', () => {
  it('should reject immediately when the request is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      runSmartFilter({
        description: 'anything',
        emails: [EMAIL],
        provider: { classifyEmails: vi.fn() },
        signal: controller.signal
      })
    ).rejects.toMatchObject({
      code: 'AI_PROVIDER_ERROR',
      message: 'Smart filter request was cancelled'
    });
  });

  it('should wrap unknown provider exceptions with batch context', async () => {
    await expect(
      runSmartFilter({
        description: 'anything',
        emails: [EMAIL],
        provider: {
          classifyEmails: vi.fn().mockRejectedValue(new Error('provider offline'))
        }
      })
    ).rejects.toMatchObject({
      code: 'AI_PROVIDER_ERROR',
      message: 'Failed to classify emails during smart filter run',
      details: {
        batch: 1,
        cause: 'provider offline'
      }
    } satisfies Partial<AiProviderError>);
  });
});
