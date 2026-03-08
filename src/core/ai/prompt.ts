/**
 * T015: Classification prompt template
 */

import type { EmailMetadata } from './provider.js';

/**
 * Build classification prompt for AI to evaluate emails
 * @param filterDescription - Natural language description of desired emails
 * @param emails - Array of email metadata to evaluate
 * @returns Full prompt string
 */
export function buildClassificationPrompt(
  filterDescription: string,
  emails: EmailMetadata[]
): string {
  const systemPrompt = `You are an email filtering assistant. Your task is to evaluate emails against a user's natural language filter description.

Respond with a JSON array of classifications. Each classification must have:
- "email_id": the email's ID
- "matches": boolean - whether the email matches the filter description  
- "confidence": number 0.0-1.0 - how confident you are in the match
- "reasoning": string (optional) - brief explanation of your decision

Return ONLY the JSON array, no other text.`;

  const emailsList = emails
    .map(
      (email) => `Email ID: ${email.id}
Subject: ${email.subject}
From: ${email.sender}
Preview: ${email.snippet}`
    )
    .join('\n---\n');

  const userPrompt = `Filter description: "${filterDescription}"

Emails to evaluate:
${emailsList}

Respond with JSON array of classifications.`;

  return `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
}

export interface EmailForSummary {
  id: string;
  subject: string;
  sender: string;
  body: string;
}

/**
 * Build summary prompt for AI to generate email summaries
 * @param email - Email to summarize
 * @returns Full prompt string
 */
export function buildSummaryPrompt(email: EmailForSummary): string {
  const systemPrompt = `You are an email summarization assistant. Your task is to generate concise summaries of emails.

The summary MUST follow this exact format:
1. One sentence describing the content of the email
2. A bullet list of action items (if any) identified in the email

Respond with a JSON object containing:
- "summary": string - the one sentence description
- "action_items": string[] - array of action items found (can be empty array if none)
- "generated_at": string - current timestamp in ISO format

Return ONLY the JSON object, no other text.`;

  const userPrompt = `Email to summarize:
Subject: ${email.subject}
From: ${email.sender}
Body:
${email.body}`;

  return `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
}
