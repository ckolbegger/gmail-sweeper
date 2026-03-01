# Handoff Document: Gmail Sweep - Smart Inbox Organizer

**Project**: Gmail Sweep CLI TUI Application  
**Feature**: 001-smart-inbox-organizer  
**Branch**: `kimi`  
**Last Updated**: 2026-02-07  
**Status**: Phase 3 (User Story 1) Complete - CLI is Runnable!

---

## Project Overview

A CLI TUI application for organizing Gmail inboxes using natural language queries. Built with TypeScript, Ink (React for CLI), SQLite, and local LLM (Ollama) for natural language processing.

### Key Documents

| Document | Location | Purpose |
|----------|----------|---------|
| **Specification** | `specs/001-smart-inbox-organizer/spec.md` | User stories, requirements, success criteria |
| **Implementation Plan** | `specs/001-smart-inbox-organizer/plan.md` | Technical architecture, phases, dependencies |
| **Tasks** | `specs/001-smart-inbox-organizer/tasks.md` | Detailed implementation tasks (131 tasks) |
| **Data Model** | `specs/001-smart-inbox-organizer/data-model.md` | TypeScript interfaces, SQLite schema, Zod validation |
| **Quickstart** | `specs/001-smart-inbox-organizer/quickstart.md` | User-facing setup and usage guide |

---

## Current Status

### ✅ Completed

**Phase 1: Setup**
- Project structure initialized
- TypeScript, ESLint, Prettier configured
- Vitest testing framework set up
- Dependencies installed (ink, googleapis, better-sqlite3, ollama, zod)

**Phase 2: Foundational Infrastructure**
- SQLite database with migration system
- Core models: Email, Label, Query, Session, Workflow
- Contract interfaces: Gmail API, shared types
- Error handling: GmailError, DatabaseError, ValidationError
- Logging infrastructure

**Phase 3: User Story 1 (COMPLETE - CLI Runnable)**
- ✅ T029 - AuthManager with OAuth2 flow and secure token storage
- ✅ T030 - GmailClient for email fetching with rate limiting
- ✅ T031 - Email sync (full and incremental)
- ✅ T028 - LabelRepository for label caching
- ✅ T038 - CLI entry point with `auth`, `sync`, and main TUI commands
- ✅ T037 - Main App component wiring everything together
- Comprehensive test suite (**229 tests passing**)

### ⏳ Next Steps (Priority Order)

The CLI is now **runnable**! To test it:

1. Set up Google OAuth2 credentials (see Environment Setup below)
2. Run `npm run build` to compile
3. Run `node dist/cli/index.js auth` to authenticate
4. Run `node dist/cli/index.js sync` to sync emails
5. Run `node dist/cli/index.js` to launch the TUI

**Next User Stories to Implement:**

1. **US2 - Natural Language Search** (Priority: P1)
   - T050 - Ollama client wrapper
   - T051 - NLQueryEngine for semantic search
   - T055 - QueryInput TUI component
   - T056 - Integrate NL query with email list

2. **US3 - Email Actions** (Priority: P1)
   - T063 - Email selection state management
   - T064-067 - Gmail actions (label, archive, delete)
   - T068-069 - Keyboard shortcuts for selection/actions
   - T070 - Action confirmation dialog

---

## Architecture

### Project Structure

```
src/
├── core/                    # Shared business logic library
│   ├── models/              # Email, Query, Workflow, Session, Label entities
│   ├── services/            # Business logic (repos, API clients, engines)
│   ├── persistence/         # Database, migrations
│   ├── contracts/           # TypeScript interfaces
│   ├── errors/              # Error classes
│   └── logging/             # Logging utilities
├── cli/                     # CLI TUI wrapper
│   ├── components/          # Ink/React TUI components
│   ├── hooks/               # React hooks for keyboard, etc.
│   └── index.ts             # Entry point
└── web/                     # Future web interface (Phase 3)

tests/
├── unit/                    # Unit tests (mocked deps)
├── integration/             # Integration tests
└── contract/                # API contract tests
```

### Key Technologies

| Layer | Technology | Purpose |
|-------|------------|---------|
| CLI Framework | `ink` (React-based) | Terminal UI rendering |
| Database | `better-sqlite3` | Local SQLite storage |
| Gmail API | `googleapis` | Gmail API integration |
| NLP/LLM | `ollama` + `qwen2.5:7b` | Natural language processing |
| Validation | `zod` | Runtime type validation |
| Auth Storage | `@napi-rs/keyring` | Secure OAuth token storage |
| Testing | `vitest` | Test framework |
| Build | `tsc` + `@yao-pkg/pkg` | Compilation to binary |

### Database Schema

**Primary Tables:**
- `emails` - Synchronized Gmail messages
- `queries` - Saved natural language queries
- `workflows` - Query-action pairs for automation
- `sessions` - Session tracking for sync
- `labels` - Gmail label cache
- `workflow_executions` - Execution history

See `specs/001-smart-inbox-organizer/data-model.md` for full schema.

---

## Implementation Patterns

### Error Handling

Use domain-specific error classes from `src/core/errors/index.ts`:

```typescript
import { GmailError, DatabaseError } from '../errors/index.js';

// Gmail API errors
throw new GmailError('RATE_LIMITED', 'Too many requests', originalError);

// Database errors
throw new DatabaseError('QUERY_FAILED', 'Insert failed', originalError);
```

### Repository Pattern

Repositories handle data access (see `EmailRepository` as reference):

```typescript
export class SomeRepository {
  constructor(private db: AppDatabase) {}
  
  async save(entity: Entity): Promise<void> {
    const database = this.db.getDatabase();
    // Use prepared statements
    const stmt = database.prepare('INSERT OR REPLACE...');
    stmt.run(...values);
  }
}
```

### TUI Components (Ink)

Use React.createElement (JSX not configured). See `EmailList` as reference:

```typescript
import React from 'react';
import { Box, Text } from 'ink';

export function MyComponent(props: Props): React.ReactElement {
  return React.createElement(Box, {},
    React.createElement(Text, {}, 'Hello')
  );
}
```

### Testing (Vitest)

**Unit Tests:** Mock all external dependencies
**Integration Tests:** Use test database, mock external APIs
**Contract Tests:** Verify API client behavior against real responses

Run tests: `npm test` (or `npm run test:run` for single run)

---

## User Stories & MVP Scope

### MVP (User Stories 1-3)

1. **US1 - Browse and Filter** ⏳ IN PROGRESS
   - View Gmail inbox in TUI
   - Sort by date, sender, label, category
   - Filter by sender, date range, label, read status

2. **US2 - Natural Language Search** ⏳ PENDING
   - Enter natural language queries
   - Ollama LLM interprets and finds matching emails
   - Display results in email list

3. **US3 - Email Actions** ⏳ PENDING
   - Select individual or all emails
   - Apply labels, archive, delete
   - Batch operations with progress

### Post-MVP (User Stories 4-5)

4. **US4 - Save Queries and Actions**
   - Save NL queries with associated actions
   - Manage saved workflows

5. **US5 - Automated Session Workflows**
   - Auto-run saved queries on new emails
   - Session-based automation

---

## Environment Setup

### Prerequisites
- Node.js 20+
- SQLite (bundled via better-sqlite3)
- Ollama (for NLP feature) - `ollama pull qwen2.5:7b`

### Environment Variables

Copy `.env.example` to `.env`:

```bash
# Gmail OAuth2 (required)
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
GMAIL_REDIRECT_URI=http://localhost:3000/oauth2callback

# Database (optional, uses default if not set)
GMAIL_SWEEP_DB=~/.local/share/gmail-sweep/emails.db

# Ollama (optional)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### Available Commands

```bash
# Development
npm run dev              # Run CLI with tsx
npm run build            # Compile TypeScript
npm run test             # Run tests in watch mode
npm run test:run         # Run tests once
npm run typecheck        # Type checking
npm run lint             # ESLint
npm run format           # Prettier

# Production
npm run compile          # Build single binary with pkg
```

---

## Key Files Reference

### Core Services

| File | Task | Status | Description |
|------|------|--------|-------------|
| `src/core/services/auth-manager.ts` | T029 | ✅ | OAuth2 authentication flow |
| `src/core/services/gmail-client.ts` | T030-031 | ✅ | Gmail API client + sync |
| `src/core/services/label-repository.ts` | T028 | ✅ | Label caching CRUD |
| `src/core/services/email-repository.ts` | T027 | ✅ | Email CRUD operations |
| `src/core/services/nl-query-engine.ts` | T051 | ⏳ | Natural language query processing |
| `src/core/services/selection-service.ts` | T063 | ⏳ | Email selection state |
| `src/core/services/workflow-engine.ts` | T083-084 | ⏳ | Workflow creation and execution |

### CLI Components

| File | Task | Status | Description |
|------|------|--------|-------------|
| `src/cli/index.ts` | T038 | ✅ | CLI entry point |
| `src/cli/app.tsx` | T037 | ✅ | Main app component |
| `src/cli/components/email-list.tsx` | T034 | ✅ | Email list TUI |
| `src/cli/components/email-detail.tsx` | T035 | ✅ | Email detail view |
| `src/cli/components/query-input.tsx` | T055 | ⏳ | Natural language input |
| `src/cli/components/action-dialog.tsx` | T070 | ⏳ | Action confirmation dialogs |
| `src/cli/components/workflow-list.tsx` | T085 | ⏳ | Saved workflows display |

### Contract Interfaces (Reference)

- `src/core/contracts/gmail-api.ts` - GmailClient, AuthManager interfaces
- `src/core/contracts/types.ts` - Shared domain types

---

## Testing Status

**Current: 229 tests passing**

| Test File | Tests | Status |
|-----------|-------|--------|
| `tests/unit/core/models/email.test.ts` | 15 | ✅ Pass |
| `tests/unit/core/models/label.test.ts` | 13 | ✅ Pass |
| `tests/unit/core/errors/index.test.ts` | 16 | ✅ Pass |
| `tests/unit/core/logging/index.test.ts` | 8 | ✅ Pass |
| `tests/unit/core/persistence/database.test.ts` | 5 | ✅ Pass |
| `tests/unit/core/email-repository.test.ts` | 25 | ✅ Pass |
| `tests/unit/core/email-sort-filter.test.ts` | 32 | ✅ Pass |
| `tests/unit/core/auth-manager.test.ts` | 13 | ✅ Pass |
| `tests/unit/core/gmail-client.test.ts` | 17 | ✅ Pass |
| `tests/unit/cli/components/email-list.test.tsx` | 8 | ✅ Pass |
| `tests/unit/cli/components/email-detail.test.tsx` | 7 | ✅ Pass |
| `tests/unit/cli/hooks/use-keyboard.test.tsx` | 6 | ✅ Pass |
| `tests/integration/email-list.test.ts` | 18 | ✅ Pass |
| `tests/contract/gmail-client.test.ts` | 46 | ✅ Pass |

---

## Common Commands

### Running the Application

```bash
# After implementing auth and sync:
npm run dev auth         # Authenticate with Gmail
npm run dev sync         # Sync emails
npm run dev              # Launch TUI

# Build and run binary:
npm run build
npm run compile
./dist/gmail-sweep
```

### Running Tests

```bash
# All tests
npm run test:run

# Specific test file
npm run test:run -- tests/unit/core/email-repository.test.ts

# With coverage
npm run test:run -- --coverage
```

---

## Important Notes

### Strict TDD Required

Per project constitution, tests MUST be written FIRST:
1. Write test → see it FAIL
2. Implement code → see test PASS
3. Refactor if needed

### Code Style

- Use TypeScript with explicit types
- No JSX - use `React.createElement()`
- Prefer `async/await` over callbacks
- Repository pattern for data access
- Contract interfaces define boundaries

### OAuth2 Setup Required

To test Gmail integration, you need:
1. Google Cloud project
2. OAuth2 credentials (Desktop app type)
3. Enable Gmail API
4. Add test users (if app unpublished)

### Ollama for NLP

Natural language queries require Ollama running locally:
```bash
ollama serve
ollama pull qwen2.5:7b
```

---

## Blockers & Considerations

1. **OAuth2 Credentials**: Need real Google Cloud credentials for full testing
2. **Gmail API Quotas**: Be mindful of rate limits during sync testing
3. **Native Modules**: `better-sqlite3` and `@napi-rs/keyring` compile native code
4. **Binary Compilation**: `pkg` may need special config for native modules

---

## Next Session Checklist

When resuming work:

1. [ ] Run `npm test` to verify current state
2. [ ] Review `specs/001-smart-inbox-organizer/tasks.md` for next task
3. [ ] Check if `.env` is configured with OAuth2 credentials
4. [ ] Verify Ollama is running if working on NLP features
5. [ ] Run `npm run typecheck` before making changes

---

## Contact & Resources

- **Feature Spec**: `specs/001-smart-inbox-organizer/spec.md`
- **Task List**: `specs/001-smart-inbox-organizer/tasks.md`
- **Data Model**: `specs/001-smart-inbox-organizer/data-model.md`
- **Quickstart**: `specs/001-smart-inbox-organizer/quickstart.md`

---

*Generated for handoff. Resume by reading this document, then check tasks.md for the next incomplete task.*
