// AI module barrel export
export {
  toConfidenceLevel,
  createAiProvider,
  AnthropicProvider,
  OpenAiProvider,
} from './provider.js';

export type {
  ConfidenceLevel,
  EmailMetadata,
  EmailClassification,
  ClassifyEmailsRequest,
  ClassifyEmailsResponse,
  AiProviderConfig,
  AiProvider,
} from './provider.js';

export { resolveAiConfig } from './config.js';
