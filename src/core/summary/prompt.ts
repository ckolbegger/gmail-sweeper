import type { Email } from '../models/index.js';
import { GmailSweepError } from '../errors.js';

export class SummaryGenerationError extends GmailSweepError {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'SummaryGenerationError';
  }
}

/**
 * Build the system + user prompt for email summarisation.
 */
export function buildSummaryPrompt(email: Email): { system: string; user: string } {
  const bodyText = email.bodyText ?? email.snippet ?? '';
  const senderName = email.sender.name ?? '';
  const senderEmail = email.sender.email;

  const system = 'You are an email summarizer. Respond in plain text only.';

  const user = [
    'Summarize this email. Respond with exactly:',
    '1. One sentence describing what the email is about.',
    '2. A blank line.',
    '3. A bullet list (using "- ") of action items required from the recipient. If there are no action items, write "- None".',
    '',
    `Email subject: ${email.subject}`,
    `From: ${senderName} <${senderEmail}>`,
    '',
    bodyText,
  ].join('\n');

  return { system, user };
}

/**
 * Parse the raw AI response into a structured summary.
 * Throws SummaryGenerationError if the response is empty or malformed.
 */
export function parseSummaryResponse(raw: string): { oneSentence: string; actionItems: string[] } {
  const trimmed = raw.trim();
  const blankLineIdx = trimmed.indexOf('\n\n');

  let oneSentence: string;
  let rest: string;

  if (blankLineIdx === -1) {
    // No blank line — first line is the sentence, rest are bullets
    const lines = trimmed.split('\n');
    oneSentence = (lines[0] ?? '').trim();
    rest = lines.slice(1).join('\n');
  } else {
    oneSentence = trimmed.slice(0, blankLineIdx).trim();
    rest = trimmed.slice(blankLineIdx + 2);
  }

  if (!oneSentence) {
    throw new SummaryGenerationError('Empty summary: no one-sentence description found');
  }

  const actionItems = rest
    .split('\n')
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2).trim())
    .filter(item => item.toLowerCase() !== 'none');

  return { oneSentence, actionItems };
}
