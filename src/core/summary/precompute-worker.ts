import type { EmailCache } from '../cache/db.js';
import type { SummaryService } from './service.js';
import { SummaryGenerationError } from './prompt.js';

export interface PrecomputeConfig {
  /** How many of the newest emails the worker aims to cover. Default: 500. */
  coverageLimit: number;
  /** Absolute position ceiling — never process email at index >= maxDepth. Default: 500. */
  maxDepth: number;
}

function parseEnvPositiveInt(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function readPrecomputeConfig(): PrecomputeConfig {
  const coverageLimit = parseEnvPositiveInt(process.env['SUMMARY_PRECOMPUTE_LIMIT']) ?? 500;
  const maxDepth = parseEnvPositiveInt(process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH']) ?? 500;
  return { coverageLimit, maxDepth };
}

export function effectiveDepth(config: PrecomputeConfig): number {
  return Math.min(config.coverageLimit, config.maxDepth);
}

const RATE_LIMIT_DELAYS = [1000, 2000, 4000];
const RATE_LIMIT_MAX_RETRIES = 3;

function isRateLimitError(err: unknown): boolean {
  if (err instanceof SummaryGenerationError) {
    const msg = err.message.toLowerCase();
    return msg.includes('429') || msg.includes('rate limit') || msg.includes('rate-limit');
  }
  return false;
}

export class PrecomputeWorker {
  private cache: EmailCache;
  private service: SummaryService;
  private config: PrecomputeConfig;
  private running = false;
  private abortController: AbortController | null = null;

  constructor(
    cache: EmailCache,
    service: SummaryService,
    config: PrecomputeConfig,
  ) {
    this.cache = cache;
    this.service = service;
    this.config = config;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.abortController = new AbortController();
    void this.runPass(this.abortController.signal);
  }

  restart(): void {
    this.stop();
    this.start();
  }

  stop(): void {
    this.running = false;
    this.abortController?.abort();
    this.abortController = null;
  }

  private async runPass(signal: AbortSignal): Promise<void> {
    try {
      const depth = effectiveDepth(this.config);
      const emails = this.cache.getEmails({ sortBy: 'date', sortDesc: true, limit: depth });

      for (const email of emails) {
        if (signal.aborted) break;

        // Skip already summarised emails
        if (this.cache.getSummary(email.id) !== null) continue;

        // Attempt summarisation with rate-limit retry
        let success = false;
        let lastError: unknown = null;

        for (let attempt = 0; attempt <= RATE_LIMIT_MAX_RETRIES; attempt++) {
          if (signal.aborted) break;

          if (attempt > 0) {
            // Back-off before retry
            const delay = RATE_LIMIT_DELAYS[attempt - 1] ?? RATE_LIMIT_DELAYS[RATE_LIMIT_DELAYS.length - 1]!;
            await new Promise<void>(r => setTimeout(r, delay));
            if (signal.aborted) break;
          }

          try {
            const summary = await this.service.summarize(email);
            this.cache.setSummary(summary);
            success = true;
            break;
          } catch (err) {
            lastError = err;
            if (isRateLimitError(err)) {
              // Will retry if attempts remain
              continue;
            }
            // Non-retryable error — skip this email
            break;
          }
        }

        // Suppress unused variable warning — lastError is intentionally consumed only in debug
        void lastError;

        if (!success && signal.aborted) break;
      }
    } catch {
      // Worker must not throw unhandled exceptions
    } finally {
      this.running = false;
    }
  }
}
