/**
 * Summary prompt builder for AI-powered email summaries
 */

import type { Email } from '../models/email.js';

export interface SummaryPrompt {
  system: string;
  user: string;
}

/**
 * Build a prompt for generating an email summary.
 *
 * @param email - The email to summarize
 * @returns System and user prompts for the LLM
 */
export function buildSummaryPrompt(email: Email): SummaryPrompt {
  const systemPrompt = `You are an email summarizer. Create concise summaries of email content.

Return a JSON object with exactly these fields:
- summary: a single sentence describing the email's content
- actionItems: an array of action items extracted from the email (strings)

Guidelines:
- The summary should capture the main topic and purpose in one clear sentence
- Extract explicit requests, deadlines, or tasks as action items
- If no action items are present, return an empty array
- Be concise and factual
- Respond only with the JSON object, no additional text`;

  const emailContent = email.body.text || email.snippet || 'No content';

  const userPrompt = `Email:
Subject: ${email.subject}
From: ${email.sender.name || email.sender.email}
Date: ${email.dateReceived.toLocaleDateString()}

${emailContent}`;

  return { system: systemPrompt, user: userPrompt };
}
