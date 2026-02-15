/**
 * T044: AI module barrel export
 */

export type {
  ConfidenceLevel,
  EmailMetadata,
  EmailClassification,
  AiProvider,
} from './provider.js';

export {
  toConfidenceLevel,
  createAiProvider,
} from './provider.js';

export type { AiProviderConfig } from './config.js';
export { resolveAiConfig } from './config.js';

export { buildClassificationPrompt } from './prompt.js';
