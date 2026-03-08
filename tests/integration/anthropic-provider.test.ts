/**
 * Integration test: AnthropicProvider against live Anthropic API.
 *
 * Sends 3 emails for classification with filter "emails including an invitation"
 * and asserts the trading seminar invitation is identified as a match.
 *
 * Requires AI_PROVIDER=anthropic, AI_API_KEY, AI_MODEL set in .env.
 */

import 'dotenv/config';
import { describe, it, expect } from 'vitest';
import { AnthropicProvider } from '../../src/core/ai/anthropic.js';
import { resolveAiConfig } from '../../src/core/ai/config.js';
import type { EmailMetadata } from '../../src/core/ai/provider.js';

const emails: EmailMetadata[] = [
  {
    id: 'email-1',
    subject: 'Your Daily News Briefing — Top Headlines for Feb 15',
    senderName: 'Morning Digest',
    senderEmail: 'digest@morningnews.com',
    snippet:
      'Markets rally on strong jobs data. Congress debates new climate bill. Tech giants report record earnings. Plus: weekend weather forecast for your area.',
  },
  {
    id: 'email-2',
    subject: '50% Off DevTools Pro — Limited Time Offer',
    senderName: 'DevTools Marketing',
    senderEmail: 'offers@devtoolspro.io',
    snippet:
      'Upgrade to DevTools Pro and save 50% this week only. Includes advanced debugging, performance profiling, and team collaboration features. Use code SAVE50 at checkout.',
  },
  {
    id: 'email-3',
    subject: 'You\'re Invited: Live Trading Seminar — Mastering Options Strategies',
    senderName: 'Alpha Trading Academy',
    senderEmail: 'events@alphatrading.com',
    snippet:
      'Join us on March 5th for an exclusive live seminar on advanced options strategies. Limited seats available. RSVP now to reserve your spot. Refreshments provided.',
  },
];

describe('AnthropicProvider — live API', () => {
  const config = resolveAiConfig();

  it('should classify the trading seminar email as matching "emails including an invitation"', async () => {
    if (!config || config.provider !== 'anthropic') {
      console.warn('Skipping: AI_PROVIDER is not anthropic or config missing');
      return;
    }

    const provider = new AnthropicProvider(config);

    const response = await provider.classifyEmails({
      filterDescription: 'emails including an invitation',
      emails,
    });

    expect(response.results).toHaveLength(3);

    const seminar = response.results.find((r) => r.emailId === 'email-3');
    const news = response.results.find((r) => r.emailId === 'email-1');
    const promo = response.results.find((r) => r.emailId === 'email-2');

    expect(seminar).toBeDefined();
    expect(seminar!.matches).toBe(true);
    expect(seminar!.confidence).toBeGreaterThanOrEqual(0.7);

    expect(news).toBeDefined();
    expect(news!.matches).toBe(false);

    expect(promo).toBeDefined();
    expect(promo!.matches).toBe(false);
  }, 30_000);
});
