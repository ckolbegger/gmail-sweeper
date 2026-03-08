# Review Follow-Up Tasks

- [X] R001 Auto-heal malformed summary cache data in `src/adapters/storage/summary_store.ts`.
  - Back up invalid JSON files as `*.corrupt-*`.
  - Reset unreadable files to an empty v1 store.
  - Drop invalid summary entries while preserving valid records.
  - Rewrite healed store content automatically.

- [X] R002 Use raw email detail data (not rendered lines) for summary generation in `src/tui/app.ts` and runtime wiring.
  - Carry structured detail payload (`subject`, `sender`, raw `body`) in detail state.
  - Call `summaryService.getOrGenerateSummary` from raw detail fields only.
  - Remove/retire parsing from formatted UI lines.

- [X] R003 Make summary store writes atomic and race-safe in `src/adapters/storage/summary_store.ts`.
  - Write via temp file + `rename`.
  - Introduce per-store write serialization to avoid read-modify-write races.
  - Add regression tests for interleaved writes.

- [X] R004 Add explicit recovery tests for malformed persisted summaries.
  - Integration test: malformed cache for selected email falls back to regeneration.
  - Unit test: malformed single entry is ignored as cache miss while valid entries remain usable.

- [X] R005 Add observability for summary pipeline.
  - Track cache hit/miss, generation success/failure, and auto-heal events.
  - Emit structured logs or counters with message IDs redacted/truncated.
