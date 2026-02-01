# Implementation Plan: Smart Inbox Organizer

**Branch**: `claude` | **Date**: 2026-02-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-smart-inbox-organizer/spec.md`

## Summary

Build a TUI-based Gmail inbox organizer with natural language search capabilities. The core differentiator is semantic email matching ("find financial offers") beyond keyword search. Architecture requires a frontend-agnostic core library to support both TUI (MVP) and web interface (fast-follow). Single TypeScript codebase enables code sharing and single-process web app deployment.

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 20+
**Primary Dependencies**:
- TUI: Ink (React for CLI)
- Gmail: googleapis (official Google APIs client)
- NL Classification: @anthropic-ai/sdk or @google/generative-ai
- Retry: p-retry (exponential backoff for API rate limits)
- Storage: better-sqlite3
**Storage**: SQLite (email cache, saved queries) + JSON config files
**Testing**: Vitest
**Target Platform**: Terminal/CLI + localhost web (Linux, macOS, Windows)
**Project Type**: Single project with core library + TUI + web frontends
**Performance Goals**:
- Initial inbox load: < 5 seconds (SC-001)
- NL search results: < 10 seconds (SC-002)
- Bulk actions: 100+ emails in single operation (SC-004)
**Constraints**:
- Single Gmail account per session
- Localhost only (no cloud deployment)
- Destructive actions require explicit confirmation (Constitution I)
**Scale/Scope**: Single user, personal inbox (thousands of emails)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | ✅ PASS | Destructive actions (archive, delete, label) require confirmation per FR-019/020. OAuth tokens handled securely. |
| II. Strict TDD | ✅ PASS | Test-first workflow will be enforced. Gmail API mocked in unit tests. |
| III. Modular Architecture | ✅ PASS | FR-001 requires frontend-agnostic core. TUI and web are thin presentation layers. |
| IV. CLI Excellence | ✅ PASS | FR-002a accepts account via CLI arg. Standard exit codes. Help via '?' key. |
| V. Simplicity & YAGNI | ✅ PASS | TUI MVP only (no web yet). Saved queries deferred to fast-follow. |

**Gate Status**: PASSED - proceed to Phase 0

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-inbox-organizer/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (core library API)
├── checklists/          # Quality checklists
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── core/                    # Frontend-agnostic business logic (FR-001)
│   ├── gmail/               # Gmail API integration
│   │   ├── client.ts        # GmailClient class
│   │   ├── auth.ts          # OAuth2 flow
│   │   └── types.ts         # Gmail-specific types
│   ├── search/              # Natural language search engine
│   │   ├── engine.ts        # SearchEngine orchestrator
│   │   ├── classifier.ts    # EmailClassifier interface
│   │   ├── claude.ts        # ClaudeClassifier implementation
│   │   └── gemini.ts        # GeminiClassifier implementation
│   ├── actions/             # Email actions (label, archive, delete)
│   │   └── executor.ts      # ActionExecutor with confirmation
│   ├── cache/               # Local SQLite cache
│   │   └── db.ts            # Database operations
│   ├── models/              # Domain models
│   │   └── index.ts         # Email, Label, Query, etc.
│   └── index.ts             # Core library exports
│
├── tui/                     # TUI presentation layer (Ink)
│   ├── app.tsx              # Main Ink application
│   ├── components/          # React components
│   │   ├── EmailList.tsx    # Scrollable email list
│   │   ├── EmailPreview.tsx # Email content preview
│   │   ├── SearchInput.tsx  # NL query input
│   │   └── ActionBar.tsx    # Keyboard shortcuts display
│   ├── hooks/               # Custom React hooks
│   │   ├── useKeyboard.ts   # vim/arrow key handling
│   │   └── useGmail.ts      # Gmail data fetching
│   └── index.tsx            # TUI entry point
│
├── web/                     # Web presentation layer (Express + React)
│   ├── server.ts            # Express server (API + static)
│   ├── api/                 # API route handlers
│   │   ├── emails.ts        # /api/emails endpoints
│   │   ├── search.ts        # /api/search endpoints
│   │   └── actions.ts       # /api/actions endpoints
│   └── client/              # React frontend (Vite)
│       ├── src/
│       │   ├── App.tsx
│       │   ├── components/
│       │   └── hooks/
│       └── index.html
│
└── cli/                     # CLI entry point
    └── index.ts             # Argument parsing, config loading

tests/
├── unit/                    # Core library unit tests (mocked Gmail)
│   ├── gmail/
│   ├── search/
│   └── actions/
├── integration/             # End-to-end with real/simulated Gmail
└── contract/                # Core library API contract tests
```

**Structure Decision**: Single TypeScript project with clear separation between `core/` (business logic), `tui/` (Ink presentation), and `web/` (Express + React presentation). This satisfies FR-001 (frontend-agnostic core) while enabling single-process web app deployment. Same language throughout enables direct imports and code sharing.

## Complexity Tracking

No violations to justify. Design follows constitution principles.

## Package Configuration

```json
{
  "name": "gmail-sweep",
  "type": "module",
  "scripts": {
    "dev": "tsx src/cli/index.ts",
    "build": "tsup src/cli/index.ts src/web/server.ts --format esm",
    "test": "vitest",
    "web": "tsx src/web/server.ts",
    "web:build": "vite build src/web/client"
  },
  "dependencies": {
    "ink": "^4.0.0",
    "react": "^18.0.0",
    "googleapis": "^130.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "better-sqlite3": "^9.0.0",
    "p-retry": "^6.0.0",
    "express": "^4.18.0",
    "commander": "^12.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "vitest": "^1.0.0",
    "tsx": "^4.0.0",
    "tsup": "^8.0.0",
    "vite": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/express": "^4.17.0",
    "@types/better-sqlite3": "^7.6.0"
  }
}
```
