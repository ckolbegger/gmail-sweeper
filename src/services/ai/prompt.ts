import { EmailMetadata } from './provider';

/**
 * Build the prompt for classifying a batch of emails
 */
export function buildClassificationPrompt(description: string, emails: EmailMetadata[]): string {
  const emailList = emails.map(e => ({
    id: e.id,
    subject: e.subject,
    from: `${e.senderName} <${e.senderEmail}>`,
    snippet: e.snippet
  }));

  return `You are an email classification assistant.
Your task is to determine which of the provided emails match the following natural language description:
"${description}"

For each email, provide:
1. emailId
2. matches (boolean)
3. confidence (number between 0.0 and 1.0)
4. reasoning (short explanation)

Return your response ONLY as a JSON object with a "results" array.

Emails to classify:
${JSON.stringify(emailList, null, 2)}
`;
}

/**
 * Build the prompt for summarizing an email
 */
export function buildSummaryPrompt(content: string): string {
  return `You are an email summarization assistant.
Your task is to summarize the following email content.
Provide exactly two things:
1. A single one-sentence description of the content.
2. A bulleted list of action items extracted from the email. If there are no action items, provide an empty list.

Return your response ONLY as a JSON object with a "summary" object containing:
- "description" (string)
- "actionItems" (array of strings)

Email content:
${content}
`;
}
