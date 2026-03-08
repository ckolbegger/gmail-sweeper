# Quickstart: AI Summary

## Prerequisites

- Node.js >=20
- Existing interactive detail navigation flow working
- AI provider configuration available (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`)
- Feature docs present under `specs/006-openai-ai-summary/`

## Scope Of This Feature

- Add `s` key in detail view to toggle full email and AI summary.
- Detail help text in-app must include: `Keys: s toggles summary/full, b or Esc returns to list, e archives, # deletes, q quits`.
- Generate summary once per email when missing, with visible loading spinner.
- Ignore repeated `s` presses while summary generation is in flight.
- Persist summary by message ID and reuse it across app restarts.
- On generation failure, remain in full detail view and show an error message.

## Suggested Implementation Flow (Strict TDD)

1. Add failing key-mapping and UI-state tests:
   ```bash
   npm run test -- tests/unit/input_controller.test.ts tests/unit/tui_app.test.ts
   ```
2. Add failing service and storage tests:
   ```bash
   npm run test -- tests/unit/email_summary_service.test.ts tests/unit/summary_store.test.ts
   ```
3. Add failing provider parsing/format tests:
   ```bash
   npm run test -- tests/unit/openai_provider.test.ts tests/unit/anthropic_provider.test.ts
   ```
4. Add failing integration tests for interactive flow:
   ```bash
   npm run test -- tests/integration/detail_navigation_flow.test.ts tests/integration/detail_navigation_keys.test.ts
   ```
5. Implement minimal code to satisfy tests in red-green-refactor order.
6. Run full validation:
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

## Expected Acceptance Scenarios

- Pressing `s` in full detail with no cached summary shows spinner, then summary lines.
- Pressing `s` while spinner is active does not trigger additional summary requests.
- Pressing `s` from summary view returns to full detail.
- Cached summaries are reused without additional LLM calls.
- Missing action items render as a single bullet `- None`.
- Summary generation errors keep full detail visible with an error status.

## Architectural Notes

- Keep UI concerns in `src/tui/app.ts` and `src/tui/input_controller.ts`.
- Keep generation/caching orchestration in `src/services/email_summary_service.ts`.
- Keep filesystem persistence in `src/adapters/storage/summary_store.ts`.
- Avoid embedding business formatting rules directly in render helpers.
