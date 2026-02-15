import type { EmailMetadata } from '@/adapters/ai/provider.js';

export interface ClassificationPrompt {
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
