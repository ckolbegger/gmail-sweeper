# claude Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-14

## Active Technologies
- TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`) + Ink 4.0 (TUI rendering), React 18 (Ink substrate), ink-testing-library 3.0 (component tests) (003-claude-detail-content-format)
- N/A — read-only display feature (003-claude-detail-content-format)
- TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`) + Ink 4.0, React 18, ink-testing-library 3.0, googleapis 130 (004-claude-email-actions)
- N/A — email list is in-memory React state; Gmail API is the source of truth (004-claude-email-actions)
- TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`) + Ink 4.0, React 18, ink-testing-library 3.0, @anthropic-ai/sdk (existing), openai (existing) (006-claude-ai-summary)
- sql.js SQLite via existing `EmailCache` (`src/core/cache/db.ts`) — new `email_summaries` table added (006-claude-ai-summary)

- TypeScript 5.4 (strict mode, ES2022 target, ESM) + Ink 4.0 (TUI), googleapis 130 (Gmail), @anthropic-ai/sdk 0.20, openai (to add) (002-smart-email-filter)

## Project Structure

```text
src/
  core/
    summary/        # AI email summarisation (006-claude-ai-summary)
      index.ts      # barrel export
      prompt.ts     # buildSummaryPrompt, parseSummaryResponse, SummaryGenerationError
      service.ts    # SummaryService (Anthropic + OpenAI)
    cache/db.ts     # extended: email_summaries table, getSummary(), setSummary()
    models/index.ts # extended: EmailSummary interface
  tui/
    hooks/useEmailSummary.ts   # idle/loading/ready/error state machine
    components/EmailPreview.tsx # extended: viewMode + summaryState props
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.4 (strict mode, ES2022 target, ESM): Follow standard conventions

## Recent Changes
- 006-claude-ai-summary: Added TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`) + Ink 4.0, React 18, ink-testing-library 3.0, @anthropic-ai/sdk (existing), openai (existing)
- 004-claude-email-actions: Added TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`) + Ink 4.0, React 18, ink-testing-library 3.0, googleapis 130
- 003-claude-detail-content-format: Added TypeScript 5.4, strict mode, ESM (`"module": "NodeNext"`) + Ink 4.0 (TUI rendering), React 18 (Ink substrate), ink-testing-library 3.0 (component tests)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
