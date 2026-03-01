# Quickstart: Email Detail Rendering Improvements

## Prerequisites

- Node.js >=20
- Existing inbox/detail flow working (from `001-smart-inbox-organizer`)
- Feature spec and plan available under `specs/003-email-rendering/`

## Scope of Work

This feature updates detail-pane rendering only:
- Collapse blank-line runs to max two lines.
- Replace raw URLs with readable tokens (anchor text when available, hostname otherwise).
- Apply token truncation cap: `max(12, floor(detailPaneWidth / 2))`, with ellipsis inside the cap.

## Suggested Implementation Flow (Strict TDD)

1. Add failing unit tests for normalization and URL token rendering:
   ```bash
   npm run test -- tests/unit/email_preview.test.ts
   ```
2. Add formatter-focused unit tests:
   ```bash
   npm run test -- tests/unit/email_detail_formatter.test.ts
   ```
3. Implement minimal formatter logic in TUI layer.
4. Run targeted integration checks:
   ```bash
   npm run test -- tests/integration/detail_navigation_flow.test.ts
   ```
5. Run full validation:
   ```bash
   npm run test
   npm run lint
   npm run build
   ```

## Expected Test Scenarios

- Three or more blank lines collapse to two.
- Whitespace-only lines are treated as blank.
- URL detection excludes trailing punctuation.
- Readable token source follows anchor-text-else-hostname rule.
- Truncated token length follows `max(12, floor(width/2))`.
- Non-URL content remains unchanged.

## Architectural Notes

- Keep formatting logic pure and deterministic for easy unit testing.
- Keep rendering transform in `src/tui/*` layer; do not push formatting into Gmail adapters.
- Do not introduce persistence or side effects for URL interaction in this scope.
- Do not add caching in this feature; anchor extraction remains request-local.
- Do not require copy/open interaction metadata in rendered output for this feature.
