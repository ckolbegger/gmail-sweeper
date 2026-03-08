import type { EmailMetadata, SummarizeEmailRequest } from '@/adapters/ai/provider.js';

export interface ClassificationPrompt {
  system: string;
  user: string;
}

export interface SummaryPrompt {
  system: string;
  user: string;
}

export function buildClassificationPrompt(
  filterDescription: string,
  emails: EmailMetadata[]
): ClassificationPrompt {
  const system =
    'You are an email classifier. Return ONLY JSON with results entries containing emailId, matches, confidence, and optional reasoning.';

  const user = [
    `Filter description: ${filterDescription}`,
    'Emails JSON:',
    JSON.stringify(emails)
  ].join('\n\n');

  return { system, user };
}

export function buildSummaryPrompt(input: SummarizeEmailRequest): SummaryPrompt {
  const system = [
    'You summarize one email at a time.',
    'Return only JSON with keys summarySentence and actionItems.',
    'summarySentence must be exactly one sentence.',
    'actionItems must be an array of short strings and can be empty when none exist.'
  ].join(' ');

  const user = [
    `Message ID: ${input.messageId}`,
    `Subject: ${input.subject}`,
    `From: ${input.sender}`,
    'Body:',
    input.body
  ].join('\n\n');

  return { system, user };
}
