# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gmail Sweep** is a TypeScript/Node.js CLI application for intelligent Gmail inbox organization using natural language processing. It provides a terminal-based TUI for browsing, filtering, and organizing emails with semantic search powered by local LLM (Ollama).

**Key Features**: Natural language email search, workflow automation, local SQLite storage, OAuth2 Gmail integration, offline-capable NLP.

## Commands

### Development
```bash
npm install              # Install dependencies
npm run build           # Build with esbuild/vite
npm run compile         # Create single binary with @yao-pkg/pkg
```

### Testing
```bash
npm test                # Run all tests (Vitest)
npm test tests/unit/core/services/gmail-client.test.ts
```

### Running the App
```bash
gmail-sweep             # Launch TUI
gmail-sweep auth        # OAuth2 authentication
gmail-sweep sync        # Full email sync
gmail-sweep sync --incremental
```

## Architecture

### Three-Layer Structure

```
src/
├── core/           # Shared business logic (used by CLI + future web)
│   ├── models/     # Domain entities: Email, Query, Workflow, Session
│   ├── services/   # Business logic: Gmail client, NLP engine, workflow engine
│   └── persistence/ # SQLite database, migrations
├── cli/            # Thin TUI wrapper (Ink/React for terminal)
│   ├── components/ # React components (email list, detail view, query input)
│   └── hooks/      # Keyboard navigation, state management
└── web/            # Future: HTTP server + static frontend (Phase 3)
```

**Key Design Principle**: All business logic lives in `src/core/`. The CLI is just a view layer. This enables the same codebase to power both CLI and future web interfaces without duplication.

### Technology Stack

- **TUI**: Ink (React for CLI) - enables familiar React patterns in terminal
- **NLP**: Ollama with `qwen2.5:7b` - local, private, offline-capable semantic search
- **Storage**: SQLite via `better-sqlite3` - local file-based, no external DB
- **Auth**: `@napi-rs/keyring` - OS keyring for secure OAuth2 token storage
- **Gmail**: `googleapis` - official Gmail API client
- **Binary**: `@yao-pkg/pkg` - single executable compilation

### Data Flow

1. **Auth**: OAuth2 flow stores tokens in OS keyring
2. **Sync**: Gmail API → SQLite (metadata only, full content fetched on-demand)
3. **Query**: User input → Ollama LLM → semantic matching → filtered email list
4. **Actions**: User selections → Gmail API → apply labels/archive/delete

## Development Workflow

### Strict TDD

Tests MUST be written FIRST and must FAIL before implementation. This is enforced throughout the task breakdown.

**Test Framework**: Vitest with `tsx` for TypeScript execution
**Coverage Target**: >80%

### Test Organization

```
tests/
├── unit/         # Mock dependencies, test individual functions/classes
├── integration/  # Test complete user stories (Gmail API, NL query, workflows)
└── contract/     # Test interface compliance with external dependencies
```

### Task Breakdown

The implementation plan (`specs/001-smart-inbox-organizer/tasks.md`) organizes work into:
- **Phase 1**: Project setup
- **Phase 2**: Foundational infrastructure (database, models, contracts) - BLOCKS all user stories
- **Phase 3-7**: User story implementation (US1-US5)
- **Phase 8**: Hardening and deployment

Tasks are marked `[P]` for parallel-safe (different files, no dependencies).

## Specification Documents

All design decisions are documented in `specs/001-smart-inbox-organizer/`:

- `spec.md` - Feature specification with 5 user stories and acceptance criteria
- `plan.md` - Implementation plan with 136 tasks and technical context
- `data-model.md` - Entity definitions (Email, Query, Workflow, Session)
- `research.md` - Technical research (Gmail API, NLP options, TUI selection)
- `quickstart.md` - User guide with keyboard shortcuts and CLI commands
- `contracts/` - TypeScript interfaces for all major components

## Key Implementation Notes

### Natural Language Processing

The "magic feature" uses Ollama with `qwen2.5:7b` model. Queries like "financial offers" are sent to the local LLM which returns semantic matching criteria. This happens entirely on-device - no email data leaves the user's machine.

### Performance Requirements

- Initial render: <3s for 10K emails
- NL query response: <5s
- Support 50K emails without degradation

### Gmail API Considerations

- Rate limiting handled with exponential backoff
- Batch operations for efficiency (100 emails per batch)
- `historyId` used for incremental sync
- Read-only by default; destructive actions require confirmation

### Configuration

Config file: `~/.config/gmail-sweep/config.json`

Database: `~/.local/share/gmail-sweep/emails.db`

Tokens: OS keyring (platform-specific secure storage)
