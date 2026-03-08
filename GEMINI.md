# gmail-sweep Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-31

## Active Technologies
- Node.js 20 LTS (TypeScript 5.3+) (001-smart-inbox-organizer)
- Local JSON file (`~/.config/gmail-sweep/workflows.json`) (001-smart-inbox-organizer)
- TypeScript 5.3+ (Node.js 20 LTS) + React, Ink, html-to-text, open, clipboardy (003-gemini-clean-email-rendering)
- N/A (View layer only) (003-gemini-clean-email-rendering)
- TypeScript 5.3+ (Node.js 20 LTS) + React, Ink, googleapis (Gmail API v1) (004-gemini-archive-delete-action)
- N/A (Memory state + external Gmail API) (004-gemini-archive-delete-action)
- TypeScript 5.3+ (Node.js 20 LTS) + React, Ink, existing `AiProvider` abstractions (006-gemini-ai-summary)
- Local JSON file (`~/.config/gmail-sweep/summaries.json`) (006-gemini-ai-summary)

- TypeScript 5.3+ (Node.js 20 LTS) (001-smart-inbox-organizer)

## Project Structure

```text
src/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.3+ (Node.js 20 LTS): Follow standard conventions

## Recent Changes
- 006-gemini-ai-summary: Added TypeScript 5.3+ (Node.js 20 LTS) + React, Ink, existing `AiProvider` abstractions
- 004-gemini-archive-delete-action: Added TypeScript 5.3+ (Node.js 20 LTS) + React, Ink, googleapis (Gmail API v1)
- 003-gemini-clean-email-rendering: Added TypeScript 5.3+ (Node.js 20 LTS) + React, Ink, html-to-text, open, clipboardy


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
