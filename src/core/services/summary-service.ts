/**
 * Summary Service
 *
 * Generates AI-powered summaries of email content using the configured LLM provider.
 * Follows the format: one sentence description + bullet list of action items.
 */

import type { AiProvider } from '../ai/provider.js';
import type { Email } from '../models/email.js';
import { buildSummaryPrompt } from '../ai/summary-prompt.js';
import { SummaryGenerationError } from '../errors/index.js';
import { logAiDebug } from '../logging/ai-debug-log.js';

// --- Types ---

/**
 * Structured email summary
 */
export interface EmailSummary {
  /** One-sentence description of email content */
  summary: string;

  /** Array of action items extracted from email */
  actionItems: string[];
}

// --- Service ---

/**
 * Summary generation service
 *
 * Uses the configured AI provider to generate concise email summaries
 * with extracted action items.
 */
export class SummaryService {
  constructor(private readonly aiProvider: AiProvider) {}

  /**
   * Generate a summary for an email.
   *
   * @param email - The email to summarize
   * @returns Promise resolving to the generated summary
   * @throws SummaryGenerationError if LLM call fails or response is malformed
   */
  async generateSummary(email: Email): Promise<EmailSummary> {
    const debugLog = (msg: string) => logAiDebug('SummaryService', msg);

    debugLog('generateSummary called');

    if (!email) {
      debugLog('ERROR: email is null');
      throw new SummaryGenerationError('Email is required');
    }

    const prompt = buildSummaryPrompt(email);
    debugLog(
      `Built prompt, system length: ${prompt.system.length}, user length: ${prompt.user.length}`
    );

    try {
      debugLog('Calling AI provider...');
      const response = await this.aiProvider.callLLM(prompt);
      debugLog(`Got response length: ${response.length}`);
      debugLog(`Response preview: ${response.substring(0, 200)}...`);
      const result = this.parseResponse(response);
      debugLog('Successfully parsed response');
      return result;
    } catch (error) {
      debugLog(`ERROR in generateSummary: ${error}`);
      debugLog(`ERROR stack: ${error instanceof Error ? error.stack : 'no stack'}`);
      if (error instanceof SummaryGenerationError) {
        throw error;
      }
      throw new SummaryGenerationError(
        'Failed to generate summary',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  /**
   * Check if a summary already exists for an email.
   *
   * @param email - The email to check
   * @returns true if summary exists (string), false if undefined/null
   */
  hasSummary(email: Email): boolean {
    return email.summary !== undefined && email.summary !== null && email.summary !== '';
  }

  /**
   * Parse summary JSON string into structured object.
   *
   * @param summaryJson - JSON string from database
   * @returns Parsed EmailSummary object
   * @throws SummaryGenerationError if JSON is malformed
   */
  parseSummary(summaryJson: string): EmailSummary {
    if (!summaryJson) {
      throw new SummaryGenerationError('Summary JSON is required');
    }

    try {
      const parsed = JSON.parse(summaryJson);
      this.validateSummary(parsed);
      return parsed as EmailSummary;
    } catch (error) {
      if (error instanceof SummaryGenerationError) {
        throw error;
      }
      throw new SummaryGenerationError(
        'Invalid summary format',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // --- Private Methods ---

  /**
   * Parse and validate LLM response
   */
  private parseResponse(text: string): EmailSummary {
    if (!text || text.trim() === '') {
      throw new SummaryGenerationError('Empty response from LLM');
    }

    // Strip markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.slice(7);
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.slice(3);
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.slice(0, -3);
    }
    cleanText = cleanText.trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleanText);
    } catch {
      throw new SummaryGenerationError('Failed to parse LLM response as JSON');
    }

    this.validateSummary(parsed);
    return parsed as EmailSummary;
  }

  /**
   * Validate summary object structure
   */
  private validateSummary(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) {
      throw new SummaryGenerationError('Summary must be an object');
    }

    const summary = obj as Record<string, unknown>;

    if (typeof summary.summary !== 'string') {
      throw new SummaryGenerationError('Summary must have a string "summary" field');
    }

    if (!Array.isArray(summary.actionItems)) {
      throw new SummaryGenerationError('Summary must have an array "actionItems" field');
    }

    for (let i = 0; i < summary.actionItems.length; i++) {
      if (typeof summary.actionItems[i] !== 'string') {
        throw new SummaryGenerationError(`Action item at index ${i} must be a string`);
      }
    }
  }
}
