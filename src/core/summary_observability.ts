export type SummaryObservabilityEventName =
  | 'summary_cache_hit'
  | 'summary_cache_miss'
  | 'summary_generation_success'
  | 'summary_generation_failure'
  | 'summary_store_autoheal_sanitized'
  | 'summary_store_autoheal_reset'
  | 'summary_store_invalid_record_rejected';

export interface SummaryObservabilityEvent {
  event: SummaryObservabilityEventName;
  timestamp: string;
  messageIdHint?: string;
  details?: Record<string, unknown>;
}

export type SummaryObservabilitySink = (event: SummaryObservabilityEvent) => void;

export function redactMessageId(messageId: string): string {
  const normalized = messageId.trim();
  if (normalized.length <= 8) {
    return normalized;
  }

  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

export function emitSummaryObservabilityEvent(
  sink: SummaryObservabilitySink | undefined,
  event: Omit<SummaryObservabilityEvent, 'timestamp'>
): void {
  const resolvedSink =
    sink ??
    (process.env.SUMMARY_OBSERVABILITY === '1'
      ? (entry: SummaryObservabilityEvent) => {
          // eslint-disable-next-line no-console
          console.log(`[summary-observability] ${JSON.stringify(entry)}`);
        }
      : undefined);

  if (!resolvedSink) {
    return;
  }

  resolvedSink({
    ...event,
    timestamp: new Date().toISOString()
  });
}
