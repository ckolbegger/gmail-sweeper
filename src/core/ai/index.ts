/**
 * AI Module Barrel Export
 *
 * T044: Public exports for the AI module
 */

// Types
export type {
  ConfidenceLevel,
  EmailMetadata,
  EmailClassification,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse,
  AiProviderConfig,
  AiProvider,
  AnthropicClient,
  OpenAiClient,
} from './provider.js';

// Functions
export { createAiProvider, toConfidenceLevel } from './provider.js';

// Config
export { resolveAiConfig } from './config.js';
export type { AiProviderConfig as ResolvedAiConfig } from './config.js';

// Prompt
export { buildClassificationPrompt } from './prompt.js';
