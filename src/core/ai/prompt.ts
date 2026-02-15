/**
 * Classification prompt template for AI providers.
 */

import type { EmailMetadata } from './provider.js';

/** Build the system prompt enforcing JSON output format. */
export function buildSystemPrompt(): string {
  return `You are an email classification assistant. Evaluate each email against the provided filter description and return your assessment as JSON.

Return ONLY valid JSON in this exact format:
{
  "results": [
    {
      "emailId": "string",
      "matches": true/false,
      "confidence": 0.0-1.0,
      "reasoning": "brief explanation"
    }
  ]
}

Rules:
- Evaluate each email independently against the filter description.
- Set "matches" to true if the email matches the filter, false otherwise.
- Set "confidence" between 0.0 and 1.0 reflecting your certainty.
- Keep "reasoning" concise (one sentence).
- Return ONLY the JSON object, no additional text.`;
}

/** Build the user prompt with filter description and email metadata. */
export function buildUserPrompt(filterDescription: string, emails: EmailMetadata[]): string {
  if (emails.length === 0) {
    return `Filter: ${filterDescription}\n\nNo emails to classify. Return {"results": []}.`;
  }

  const emailList = emails
    .map(
      (e, i) =>
        `Email ${i + 1}:
  ID: ${e.id}
  Subject: ${e.subject}
  From: ${e.senderName} <${e.senderEmail}>
  Snippet: ${e.snippet}`,
    )
    .join('\n\n');

  return `Filter: ${filterDescription}\n\nClassify the following emails:\n\n${emailList}`;
}
