import { appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AI_DEBUG_LOG_FILE = 'gmail-sweep-debug.log';

function stringifyMeta(meta: unknown): string {
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

export function logAiDebug(context: string, message: string, meta?: unknown): void {
  if (process.env.DEBUG_AI !== 'true') {
    return;
  }

  try {
    const tempDir = tmpdir();
    if (!tempDir) {
      return;
    }

    const timestamp = new Date().toISOString();
    const metaSuffix = meta === undefined ? '' : ` ${stringifyMeta(meta)}`;
    appendFileSync(
      path.join(tempDir, AI_DEBUG_LOG_FILE),
      `${timestamp} [${context}] ${message}${metaSuffix}\n`
    );
  } catch {
    return;
  }
}
