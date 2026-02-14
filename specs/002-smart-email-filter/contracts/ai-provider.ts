/**
 * Contract: AI Provider Interface
 *
 * Abstraction between smart filter service and external AI APIs.
 */

export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** Metadata sent to AI for matching */
export interface EmailMetadata {
  messageId: string;
  subject: string;
  sender: string;
  snippet: string;
}

/** Per-email classification output */
export interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number; // 0.0-1.0
  reasoning?: string;
}

export interface ClassifyEmailsRequest {
  filterDescription: string;
  emails: EmailMetadata[];
}

export interface ClassifyEmailsResponse {
  results: EmailClassification[];
}

export interface AiProviderConfig {
  provider: 'anthropic' | 'openai';
  model: string;
  apiKey: string;
  baseUrl?: string;
  maxContextTokens?: number;
}

export interface AiProvider {
  classifyEmails(request: ClassifyEmailsRequest): Promise<ClassifyEmailsResponse>;
}

export type CreateAiProvider = (config: AiProviderConfig) => AiProvider;

export function toConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
