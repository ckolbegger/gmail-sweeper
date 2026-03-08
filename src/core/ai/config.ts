import { logAiDebug } from '../logging/ai-debug-log.js';

export type AiProviderConfig = {
  provider: 'anthropic' | 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;
  maxContextTokens: number;
};

export function resolveAiConfig(): AiProviderConfig | null {
  const debugLog = (msg: string) => logAiDebug('AI Config', msg);

  const provider = process.env.AI_PROVIDER?.trim();
  const apiKey = process.env.AI_API_KEY?.trim();
  const model = process.env.AI_MODEL?.trim();
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const maxContextTokensStr = process.env.AI_MAX_CONTEXT_TOKENS?.trim();

  debugLog('Reading AI config from environment:');
  debugLog(`  AI_PROVIDER: ${provider ? `'${provider}'` : '(not set)'}`);
  debugLog(
    `  AI_API_KEY: ${apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : '(not set)'}`
  );
  debugLog(`  AI_MODEL: ${model ? `'${model}'` : '(not set)'}`);
  debugLog(`  AI_BASE_URL: ${baseUrl ? `'${baseUrl}'` : '(not set)'}`);
  debugLog(
    `  AI_MAX_CONTEXT_TOKENS: ${maxContextTokensStr ? `'${maxContextTokensStr}'` : '(not set)'}`
  );

  if (!provider || !apiKey) {
    debugLog(`Config incomplete - provider: ${!!provider}, apiKey: ${!!apiKey}`);
    return null;
  }

  const maxContextTokens = maxContextTokensStr ? parseInt(maxContextTokensStr, 10) : 32000;

  const config = {
    provider: provider as 'anthropic' | 'openai',
    apiKey,
    model: model || undefined,
    baseUrl: baseUrl || undefined,
    maxContextTokens,
  };

  debugLog(
    `Config resolved successfully: provider=${config.provider}, model=${config.model || '(default)'}`
  );
  return config;
}
