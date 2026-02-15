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
