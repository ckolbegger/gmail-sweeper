# Implementation Plan: Smart Inbox Organizer

**Branch**: `kimi` | **Date**: 2026-01-31 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-smart-inbox-organizer/spec.md`

## Summary

Build a CLI TUI application for organizing Gmail inboxes using natural language queries. The system consists of a shared core library (Gmail API, natural language processing, workflow engine) with a thin CLI wrapper. Phase 1-2 delivers the CLI; Phase 3 adds a web interface.

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js 20+
**Primary Dependencies**:
- Gmail API: `googleapis`
- TUI: `ink` (React-based CLI) - DECIDED: Ink for React familiarity, active maintenance
- NLP: `ollama` with `qwen2.5:7b` - DECIDED: Local LLM for privacy, offline capability, zero cost
- Data: `better-sqlite3` for local storage
- Binary: `pkg` or `deno compile` for single executable
**Storage**: SQLite (local file-based, no external DB needed)
**Testing**: Vitest or Jest with `tsx` for TypeScript execution
**Target Platform**: Linux/macOS terminal (Windows support Phase 2+)
**Project Type**: Single project with core library + CLI + future web
**Performance Goals**:
- Initial render: <3s for 10K emails (SC-007)
- NL query: <5s response time (SC-008)
- Support 50K emails without degradation (SC-004)
- Binary size: <100MB acceptable (compiled Node.js)
**Constraints**:
- Single-user local application
- OAuth2 token storage must be secure (`keytar` or encrypted file)
- Read-only by default; destructive actions require confirmation
- Single executable output via compilation
**Scale/Scope**:
- Personal Gmail accounts
- Inboxes up to 50K emails
- Single session per user

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Safety & Security | PASS | Spec requires OAuth2, destructive actions need confirmation |
| II. Strict TDD | PASS | Plan includes comprehensive test strategy |
| III. Modular Architecture | PASS | Core library + thin CLI wrapper design |
| IV. CLI Excellence | PASS | POSIX compliance, stdin/stdout, exit codes planned |
| V. Simplicity & YAGNI | PASS | Single-user, local SQLite, no premature web framework |

**Gate Result**: PASS - All constitution principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-inbox-organizer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
gmail-sweep/
├── src/
│   ├── core/                    # Shared business logic library
│   │   ├── index.ts
│   │   ├── models/              # Email, Query, Workflow, Session entities
│   │   │   ├── index.ts
│   │   │   ├── email.ts
│   │   │   ├── query.ts
│   │   │   ├── workflow.ts
│   │   │   └── session.ts
│   │   ├── services/            # Business logic
│   │   │   ├── index.ts
│   │   │   ├── gmail-client.ts      # Gmail API wrapper
│   │   │   ├── email-repository.ts  # Email storage/retrieval
│   │   │   ├── nl-query-engine.ts   # Natural language processor
│   │   │   ├── workflow-engine.ts   # Saved query execution
│   │   │   └── auth-manager.ts      # OAuth2 flow
│   │   └── persistence/         # Data layer
│   │       ├── index.ts
│   │       ├── database.ts
│   │       └── migrations/
│   ├── cli/                     # CLI TUI wrapper
│   │   ├── index.ts             # Entry point
│   │   ├── app.tsx              # Main Ink/React TUI application
│   │   ├── components/          # TUI components
│   │   │   ├── email-list.tsx
│   │   │   ├── email-detail.tsx
│   │   │   ├── query-input.tsx
│   │   │   └── workflow-list.tsx
│   │   └── hooks/               # React hooks for TUI
│   │       └── use-keyboard.ts
│   └── web/                     # Future web interface (Phase 3)
│       ├── server.ts            # Express/Fastify HTTP server
│       ├── routes/
│       └── static/              # Static assets (HTML/JS/CSS)
├── tests/
│   ├── unit/                    # Unit tests (mocked deps)
│   │   ├── core/
│   │   └── cli/
│   ├── integration/             # Integration tests
│   │   ├── gmail-api.test.ts
│   │   ├── nl-query.test.ts
│   │   └── workflow.test.ts
│   └── contract/                # API contract tests
│       └── gmail-contracts.test.ts
├── scripts/
│   └── build-binary.ts          # Build single executable script
├── docs/
│   └── architecture.md
├── package.json
├── tsconfig.json
├── vite.config.ts               # For bundling
├── README.md
└── .env.example
```

**Structure Decision**: Single TypeScript project with clear separation between `core/` (business logic), `cli/` (TUI interface), and `web/` (future HTTP interface). TypeScript enables maximum code sharing across all layers - the same models, services, and persistence code work in CLI, web backend, and web frontend. Compiled to a single binary via `pkg` or `deno compile` for easy distribution.

## Complexity Tracking

> No constitution violations requiring justification.

## Web App Strategy (Phase 3)

**Problem Solved**: TypeScript enables a **single-process web deployment**.

```
User runs: gmail-sweep web
         ↓
    ┌─────────────────────────┐
    │  Single Node.js Process │
    │  ┌───────────────────┐  │
    │  │  HTTP Server      │  │  ← Express/Fastify
    │  │  (serves API)     │  │
    │  └───────────────────┘  │
    │  ┌───────────────────┐  │
    │  │  Static Files     │  │  ← HTML/JS/CSS bundle
    │  │  (serves UI)      │  │     embedded in binary
    │  └───────────────────┘  │
    │  ┌───────────────────┐  │
    │  │  Core Library     │  │  ← Same code CLI uses
    │  │  (business logic) │  │
    │  └───────────────────┘  │
    └─────────────────────────┘
         ↓
    Opens browser to localhost:PORT
```

**Key Points**:
- One command starts everything
- No separate backend/frontend servers
- Static assets embedded in the binary (via `esbuild` or `vite`)
- Same SQLite database as CLI mode
- User just runs `gmail-sweep web` and opens their browser

## Phase 0: Research

### Unknowns Requiring Research

1. **NLP Approach**: OpenAI API vs local LLM vs hybrid
2. **TUI Library**: Textual vs Rich + prompt-toolkit
3. **Gmail API Patterns**: Best practices for batch operations, rate limiting
4. **OAuth2 Storage**: Secure token persistence (keyring vs encrypted file)

### Research Tasks

```text
Task: "Research NLP options for email classification: OpenAI API vs local LLM (ollama, llama.cpp Node bindings) vs rule-based hybrid. Consider cost, latency, privacy, offline capability, TypeScript SDK availability."

Task: "Research TypeScript CLI TUI libraries: Ink (React-based) vs Blessed vs oclif. Compare: React familiarity, keyboard navigation, data tables, bundle size, binary compilation compatibility."

Task: "Research Gmail API best practices in Node.js: batch operations, rate limiting, pagination for large inboxes, OAuth2 scopes, error handling patterns with googleapis library."

Task: "Research secure OAuth2 token storage for Node.js CLI apps: keytar vs crypto module with encrypted file. Compare security, portability, UX, native module compilation issues."

Task: "Research Node.js binary compilation: pkg vs nexe vs deno compile. Compare: output size, startup time, native module support (SQLite), cross-platform builds."
```

**Output**: `research.md` with decisions for each unknown.

## Phase 1: Design

### Data Model

**Output**: `data-model.md` with:
- TypeScript interfaces for Email, Query, Workflow, Session entities
- SQLite schema (tables, indexes, foreign keys)
- Zod or io-ts runtime validation schemas
- Type definitions for Gmail API responses

### API Contracts

**Output**: `contracts/` with:
- `gmail-api.ts` - Gmail API wrapper TypeScript interface
- `nl-query.ts` - Natural language query engine interface
- `workflow.ts` - Workflow engine interface
- `types.ts` - Shared type definitions

### Quickstart

**Output**: `quickstart.md` with:
- Installation: `npm install -g gmail-sweep` or download binary
- Authentication: `gmail-sweep auth`
- First run: `gmail-sweep`
- Basic commands and keyboard shortcuts
- Building from source: `npm run build && npm run compile`

### Agent Context Update

Run `.specify/scripts/bash/update-agent-context.sh claude` to update Claude's context with TypeScript stack (Ink, googleapis, better-sqlite3, pkg/deno).

## Next Steps

1. Complete Phase 0 research (generate `research.md`)
2. Complete Phase 1 design (generate `data-model.md`, `contracts/`, `quickstart.md`)
3. Run `/speckit.tasks` to generate implementation tasks
