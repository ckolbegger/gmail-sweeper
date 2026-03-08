# Quickstart: Background Summary Precomputation

**Feature**: 007-summary-precompute

---

## Prerequisites

- Feature 006 (AI Email Summary) fully implemented and passing tests.
- `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` set in environment.
- At least one email in the local cache that does NOT have a summary (i.e., you have not pressed 's' on every email).

---

## Manual Verification

### US1 — Worker starts automatically and precomputes summaries

1. Start the app normally: `npm start`
2. Do NOT press 's' on any email.
3. Note the time. Wait 10–30 seconds (longer for large caches).
4. Navigate to an email you haven't opened before.
5. Press 's'.
6. **Expected**: Summary appears instantly (cache hit) — no loading indicator.

*If summary still shows ⏳, the worker hasn't reached that email yet. Try an email near the top of the inbox.*

**SC-001 (manual)**: The first cache hit from a precomputed summary should occur within 5 seconds of app start for the newest email. If it takes longer, the worker did not start promptly.

**SC-005 (manual)**: While waiting in step 3, press arrow keys repeatedly. Keystrokes should respond immediately with no perceptible lag, even while the worker is generating summaries in the background.

---

### US2 — Worker restarts after Ctrl-N (load more)

1. Start the app: `npm start`
2. Wait ~10 seconds for initial pass to progress.
3. Press `Ctrl-N` to load more emails. Note the time.
4. Wait ~30 seconds.
5. Navigate to one of the newly-loaded emails and press 's'.
6. **Expected**: Summary is pre-cached (instant) — worker restarted and covered new emails first.

**SC-002 (manual)**: The worker should restart within 2 seconds of `Ctrl-N` completing. To observe this, press `Ctrl-N`, immediately wait 5 seconds, then check the newest email with 's'. If it is already cached, restart was prompt.

---

### US3 — Coverage limit (N)

1. Set env var: `SUMMARY_PRECOMPUTE_LIMIT=5`
2. Clear summary cache (delete or rename `~/.config/gmail-sweep/emails.db`).
3. Start the app: `SUMMARY_PRECOMPUTE_LIMIT=5 npm start`
4. Wait ~30 seconds.
5. Check the first 5 emails with 's' — all should be instant (cached).
6. Check email #6 or beyond with 's' — should show ⏳ (not precomputed).

---

### US4 — Maximum depth ceiling

1. Set `SUMMARY_PRECOMPUTE_MAX_DEPTH=3` and `SUMMARY_PRECOMPUTE_LIMIT=10`.
2. Clear summary cache.
3. Start: `SUMMARY_PRECOMPUTE_LIMIT=10 SUMMARY_PRECOMPUTE_MAX_DEPTH=3 npm start`
4. Wait ~30 seconds.
5. First 3 emails → instant summary. Email #4+ → ⏳.
6. *MAXIMUM_DEPTH overrides N when lower.*

---

## Configuration Reference

| Environment Variable | Default | Description |
|---|---|---|
| `SUMMARY_PRECOMPUTE_LIMIT` | `500` | Per-pass coverage target (N) |
| `SUMMARY_PRECOMPUTE_MAX_DEPTH` | `500` | Absolute position ceiling |

Both must be positive integers. Invalid values silently fall back to 500.

---

## Troubleshooting

**Summaries never appear pre-cached**
- Confirm AI API key is set and valid.
- Check stderr for `SummaryGenerationError` messages.
- Lower `SUMMARY_PRECOMPUTE_LIMIT` to 5 to verify the worker runs at all.

**App feels slow after adding the worker**
- The worker is async and silent; it should not affect keystrokes.
- Check if `SUMMARY_PRECOMPUTE_LIMIT` is set very high (>1000) on a slow connection.
