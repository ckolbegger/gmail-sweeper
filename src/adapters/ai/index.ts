export { AnthropicProvider } from '@/adapters/ai/anthropic.js';
export { OpenAiProvider } from '@/adapters/ai/openai.js';
export { buildClassificationPrompt } from '@/adapters/ai/prompt.js';
export {
  createAiProvider,
  toConfidenceLevel,
  type AiProvider,
  type AiProviderConfig,
  type ClassifyEmailsRequest,
  type ClassifyEmailsResponse,
  type ConfidenceLevel,
  type EmailClassification,
  type EmailMetadata
} from '@/adapters/ai/provider.js';
