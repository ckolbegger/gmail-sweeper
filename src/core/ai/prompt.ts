import type { EmailMetadata } from './provider.js';

export function buildClassificationPrompt(
  filterDescription: string,
  emails: EmailMetadata[],
): { system: string; user: string } {
  const systemPrompt = `You are an email classifier. Analyze the provided emails and determine which ones match the given filter description.

Return a JSON array where each object has:
- emailId: the email ID
- matches: true if the email matches the filter, false otherwise
- confidence: a number from 0.0 to 1.0 indicating your confidence level
- reasoning: (optional) a brief explanation of your decision

Respond only with the JSON array, no additional text.`;

  const emailData = emails.map((email) => ({
    id: email.id,
    subject: email.subject,
    senderName: email.senderName,
    senderEmail: email.senderEmail,
    snippet: email.snippet,
  }));

  const userPrompt = `Filter: ${filterDescription}

Emails:
${JSON.stringify(emailData, null, 2)}`;

  return {
    system: systemPrompt,
    user: userPrompt,
  };
}
