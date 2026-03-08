import type { EmailCache } from '../cache/db.js';
import type { SummaryService } from './service.js';

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

export class PrecomputeWorker {
  constructor(
    _cache: EmailCache,
    _service: SummaryService,
    _config: PrecomputeConfig,
  ) {}

  start(): void {
    throw new Error('Not implemented');
  }

  restart(): void {
    throw new Error('Not implemented');
  }

  stop(): void {
    throw new Error('Not implemented');
  }
}
