import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { Email } from '../models/index.js';
import type { EmailSummary } from '../models/index.js';
import type { AiProviderConfig } from '../ai/provider.js';
import { buildSummaryPrompt, parseSummaryResponse, SummaryGenerationError } from './prompt.js';

export { SummaryGenerationError } from './prompt.js';

export class SummaryService {
  constructor(private readonly config: AiProviderConfig) {}

  async summarize(email: Email): Promise<EmailSummary> {
    if (this.config.provider !== 'anthropic' && this.config.provider !== 'openai') {
      throw new SummaryGenerationError(
        `Unsupported AI provider: ${String(this.config.provider)}. Supported: anthropic, openai`,
      );
    }

    const { system, user } = buildSummaryPrompt(email);

    let rawText: string;
    try {
      if (this.config.provider === 'anthropic') {
        const client = new Anthropic({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl,
        });
        const response = await client.messages.create({
          model: this.config.model,
          system,
          messages: [{ role: 'user', content: user }],
          max_tokens: 1024,
        });
        const textBlock = response.content.find(b => b.type === 'text');
        rawText = textBlock && 'text' in textBlock ? textBlock.text : '';
      } else {
        const client = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: this.config.baseUrl,
        });
        const response = await client.chat.completions.create({
          model: this.config.model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        });
        rawText = response.choices[0]?.message?.content ?? '';
      }
    } catch (err) {
      throw new SummaryGenerationError(
        `AI provider error: ${(err as Error).message}`,
        err as Error,
      );
    }

    const { oneSentence, actionItems } = parseSummaryResponse(rawText);

    return {
      emailId: email.id,
      oneSentence,
      actionItems,
      generatedAt: new Date(),
    };
  }
}
