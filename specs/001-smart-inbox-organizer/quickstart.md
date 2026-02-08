# Quickstart: Smart Inbox Organizer

## Prerequisites

- Node.js 20
- Gmail OAuth app credentials (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REDIRECT_URI`)
- Gmail account access (read-only scope for US1)

## Run (TUI MVP)

1. Install dependencies:
   - `npm install`
2. Build the project:
   - `npm run build`
3. Create `.env` in repo root (auto-loaded by CLI):
   - `GMAIL_CLIENT_ID=...`
   - `GMAIL_CLIENT_SECRET=...`
   - `GMAIL_REDIRECT_URI=...`
   - Optional: `LOG_LEVEL=info`, `DB_PATH=data/local.db`
4. First run (auth bootstrap):
   - `npm run app -- --token-path .gmail-sweeper/tokens.json`
   - Open the printed URL, authorize, and copy the `code` parameter from the redirect URL.
5. Save auth code and list inbox:
   - `npm run app -- --auth-code "<code>" --token-path .gmail-sweeper/tokens.json`
6. Re-run inbox browse/filter with saved token:
   - `npm run app -- --sender lead@work.com --label WORK --limit 20`

## Saved Queries Workflow

1. Run a query and save it with optional action.
2. On next session start, re-run saved queries against new emails.
3. Confirm actions before applying them.

## Notes

- Email content is not persisted after the session ends.
- This MVP is TUI-only; a local web app is planned as a fast follow.
- Helpful CLI flags:
  - `--sender`, `--label`, `--category`
  - `--date-from`, `--date-to` (ISO date or epoch milliseconds)
  - `--page-size`, `--page-limit`, `--limit`
