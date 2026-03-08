import type { EmailCache } from '../cache/db.js';
import type { SummaryService } from './service.js';

export interface PrecomputeConfig {
  /** How many of the newest emails the worker aims to cover. Default: 500. */
  coverageLimit: number;
  /** Absolute position ceiling — never process email at index >= maxDepth. Default: 500. */
  maxDepth: number;
}

export function readPrecomputeConfig(): PrecomputeConfig {
  return { coverageLimit: 500, maxDepth: 500 };
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
