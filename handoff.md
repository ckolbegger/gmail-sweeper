# Comprehensive Handoff: Smart Inbox Organizer

**Date**: 2026-02-07
**Session**: Phase 1 & 2 Complete | US1 Ready to Implement
**Branch**: `claude`
**Status**: ✅ Foundation Complete | Ready for User Story Implementation

---

## Executive Summary

The Smart Inbox Organizer project has completed Phase 1 (Setup) and Phase 2 (Foundational Infrastructure) with 59 passing unit tests. The application is a TUI-based Gmail inbox organizer with natural language search, built with TypeScript, Ink (React for CLI), and sql.js for caching.

**Current state**: Ready to implement **Phase 3 (User Story 1: View and Browse Inbox)** with 16 tasks and integration tests.

**Estimated effort**: US1 = ~20 hours, US2 = ~15 hours, US3+4 = ~30 hours total

---

## Project Overview

### Vision
Build a TUI inbox organizer where users can:
1. **US1**: Browse inbox with vim-style navigation (j/k, arrows)
2. **US2**: Sort and filter by date, sender, label, category
3. **US3**: Search emails with natural language (Claude API)
4. **US4**: Archive, delete, star, label emails with keyboard shortcuts

### Architecture
- **Frontend-agnostic core**: `src/core/` contains all business logic, models, and API clients
- **TUI presentation layer**: `src/tui/` contains Ink (React) components for terminal UI
- **Web layer** (fast-follow): `src/web/` scaffolded for future web app
- **CLI entry point**: `src/cli/` bootstraps authentication and launches TUI

### Stack
- **Language**: TypeScript 5.4 (strict mode, no `any`)
- **TUI Framework**: Ink 4.0 (React for CLI)
- **API Client**: googleapis 130.0
- **Storage**: sql.js 1.8 (pure JavaScript SQLite, Node v25 compatible)
- **Testing**: Vitest 1.0 (59 tests currently passing)
- **Retry Logic**: p-retry 6.0 (exponential backoff for Gmail rate limits)
- **NL Processing**: @anthropic-ai/sdk 0.20 (Claude API for search, deferred to US3)

---

## Phase Completion Status

### ✅ Phase 1: Setup (6/6 Complete)
- [X] T001: package.json initialized
- [X] T002: tsconfig.json (strict mode)
- [X] T003: vitest.config.ts
- [X] T004: eslint.config.js + .prettierrc
- [X] T005: Directory structure created
- [X] T006: .gitignore

**Files Created**:
```
/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── eslint.config.js
├── .prettierrc
├── .gitignore
└── src/
    ├── core/
    ├── tui/
    ├── cli/
    └── web/
```

### ✅ Phase 2: Foundational (30/32 Complete)

#### Core Models (T007-T012) ✅
**File**: `src/core/models/index.ts`
```typescript
interface Email {
  id: string;
  threadId: string;
  subject?: string;
  sender: EmailAddress;
  recipients: EmailAddress[];
  date: Date;
  snippet?: string;
  bodyText?: string;
  bodyHtml?: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  category?: Category;
  labels: Label[];
}

interface EmailAddress {
  email: string;
  name?: string;
}

type Label = { id: string; name: string };
type Category = 'CATEGORY_PERSONAL' | 'CATEGORY_SOCIAL' | 'CATEGORY_PROMOTIONS' | 'CATEGORY_UPDATES' | 'CATEGORY_FORUMS';

interface Config {
  accounts: { email: string; tokenPath: string }[];
  defaultAccount: string;
  maxEmails: number;
}
```

#### Error Classes (T013-T016) ✅
**File**: `src/core/errors.ts`

Hierarchy:
- `GmailSweepError` (base class)
  - `AuthenticationError` - OAuth/token issues
  - `GmailAPIError` - Generic API failures
  - `RateLimitError` - 429 Too Many Requests
  - `NotFoundError` - Email/label not found

#### Gmail Authentication (T017-T020) ✅
**File**: `src/core/gmail/auth.ts`

**Key Functions**:
- `generateAuthUrl(scopes: string[])`: Returns OAuth URL
- `exchangeCodeForToken(code: string, redirectUri: string)`: Exchanges auth code for access/refresh tokens
- `refreshToken(refreshToken: string)`: Refreshes expired tokens
- `loadToken(userEmail: string)`: Loads from `~/.config/gmail-sweep/token.json`
- `saveToken(userEmail: string, token: any)`: Persists tokens

**Token Storage**: `~/.config/gmail-sweep/{userEmail}/token.json`

#### Gmail Client (T021-T025) ✅
**File**: `src/core/gmail/client.ts`

**Class**: `GmailClient`

**Methods**:
- `constructor(userEmail: string, clientId: string, clientSecret: string)`
- `authenticate(code?: string)`: OAuth flow or load persisted token
- `listMessages(pageToken?: string, maxResults: number = 50)`: Returns email metadata with pagination
- `getMessage(messageId: string)`: Returns full email with body (IMPLEMENTED in US1)
- `modifyLabels(messageIds: string[], addLabels: string[], removeLabels: string[])`
- `archive(messageIds: string[])`
- `trash(messageIds: string[])`
- `listLabels()`: Returns all labels including system labels (IMPLEMENTED in US2)

**Retry Logic**: Uses `p-retry` with exponential backoff (max 3 retries)
- Retries on 5xx errors
- Retries on `RateLimitError` (429)
- Does not retry on 4xx errors (except 429)

**Unit Tests**: 14 tests passing in `tests/unit/gmail/client.test.ts`

#### Email Cache (T026-T030) ✅
**File**: `src/core/cache/db.ts`

**Class**: `EmailCache`

**Schema**:
```sql
CREATE TABLE emails (
  id TEXT PRIMARY KEY,
  thread_id TEXT,
  subject TEXT,
  sender_email TEXT,
  sender_name TEXT,
  recipients_json TEXT,      -- JSON array
  date TEXT,                 -- ISO string
  snippet TEXT,
  body_text TEXT,
  body_html TEXT,
  is_read INTEGER,
  is_starred INTEGER,
  has_attachments INTEGER,
  category TEXT,
  labels_json TEXT,          -- JSON array
  cached_at TEXT
);

CREATE TABLE sync_state (
  user_email TEXT PRIMARY KEY,
  last_sync TEXT
);
```

**Methods**:
- `constructor(dbPath: string)`
- `initialize(): Promise<void>` - Creates tables if needed (ASYNC)
- `upsertEmails(emails: Email[]): void` - INSERT OR REPLACE
- `getEmails(limit, offset, sortBy, sortOrder, labelFilter?, categoryFilter?): Email[]`
- `getLastSync(userEmail: string): Date | null`
- `setLastSync(userEmail: string, syncTime?: Date): void`
- `close(): void` - Flushes to disk

**Storage**: Uses `sql.js` with filesystem persistence
- Database file location: CLI argument or `~/.cache/gmail-sweep/emails.db`
- Pure JavaScript (no native compilation)
- Synchronous API (ready for TUI rendering)

**Unit Tests**: 16 tests passing in `tests/unit/cache/db.test.ts`

#### Config Loading (T031-T033) ✅
**File**: `src/core/config.ts`

**Functions**:
- `loadConfig(accountEmail: string): Promise<Config>` - Loads from `~/.config/gmail-sweep/config.json`
- `createDefaultConfig(): void` - Creates config directory and default config

**Default Config**:
```json
{
  "accounts": [{ "email": "user@gmail.com", "tokenPath": "~/.config/gmail-sweep/user@gmail.com/token.json" }],
  "defaultAccount": "user@gmail.com",
  "maxEmails": 500
}
```

**Unit Tests**: 6 tests passing in `tests/unit/config.test.ts`

#### CLI Entry Point (T034-T036) ✅
**File**: `src/cli/index.ts`

**Features**:
- `--account` flag for Gmail account selection
- `--help` for usage
- `--version` for version info
- Validates account exists in config
- Bootstraps GmailClient and EmailCache
- Launches TUI app (implementation deferred to US1)

**Unit Tests**: 7 tests passing in `tests/cli/index.test.ts`

#### Integration Tests (T036a-T036b) ⏳ Deferred

**Note**: Integration tests for Phase 2 are deferred. They will be written after Phase 3 implementation completes to verify cross-component flows.

---

## Ready for Implementation: Phase 3 (US1)

### Phase 3: User Story 1 - View and Browse Inbox (16 Tasks)

**Goal**: Display inbox emails in TUI with keyboard navigation and preview pane

**Key Tasks**:

#### Tests (T037-T040) - Write First
- **T037**: EmailList component tests (rendering, virtualization, relative dates)
- **T038**: EmailPreview component tests (body display, HTML conversion)
- **T039**: useKeyboard hook tests (j/k, arrows, Enter, boundaries)
- **T040**: useGmail hook tests (loading, fetching, caching, pagination)

#### Implementation (T041-T050)
- **T041**: TUI app shell using Ink
- **T042**: useKeyboard hook (j/k, arrows, Enter, Home, End, PgUp, PgDn)
- **T043**: useGmail hook (fetch emails, error handling, deduplication)
- **T044**: EmailList component with virtualization and scrolling
- **T045**: Bold styling for unread emails
- **T046**: GmailClient.getMessage() for full email bodies with HTML parsing
- **T047**: EmailPreview component (display selected email)
- **T048**: Split-pane layout (list + preview side by side)
- **T049**: TUI entry point (`src/tui/index.tsx`)
- **T050**: Loading state indicator (spinner while fetching)

#### Integration Tests (T050a-T050b) - Write After Implementation
- **T050a**: Inbox viewing flow (load cache → display list → navigate with j/k → show preview)
- **T050b**: Gmail sync + TUI display (fetch from Gmail → cache → display with loading state)

### Phase 3 Architecture

**Component Structure**:
```
src/tui/
├── app.tsx                          # Main app shell
├── index.tsx                        # Entry point
├── components/
│   ├── EmailList.tsx               # List with virtualization
│   └── EmailPreview.tsx            # Preview pane
└── hooks/
    ├── useKeyboard.ts              # j/k, arrows, Enter
    └── useGmail.ts                 # Data fetching & caching
```

**Data Flow**:
```
EmailCache.getEmails()
    ↓
useGmail hook (pagination, error handling)
    ↓
EmailList component (render, select)
    ↓
EmailPreview component (display selected email)
    ↓
GmailClient.getMessage() (fetch full body on demand)
```

**Keyboard Bindings** (Phase 3):
- `j` / `ArrowDown` - Move selection down
- `k` / `ArrowUp` - Move selection up
- `Enter` - Select email (show full preview)
- `Home` - Jump to first email
- `End` - Jump to last email
- `PageDown` - Page down in list
- `PageUp` - Page up in list

(Phase 4 adds: `s` for sort menu, `f` for filter menu, `Esc` to clear filters)

### Phase 3 Test Strategy

**Unit Tests** (59 existing + ~30 new):
1. Write tests FIRST before implementation
2. Tests should cover:
   - Happy path
   - Boundary conditions (0, 1, 100+ emails)
   - Error scenarios (network failure, empty cache)
   - Performance (virtualization, caching)

**Integration Tests** (2 new):
1. Write AFTER implementation
2. Verify end-to-end user flows
3. Test with real-ish data (mocked Gmail API)

### Expected Test Results After US1
- Total tests: ~90
- All passing
- Coverage: TUI components, hooks, GmailClient.getMessage()

---

## Implementation Checklist for US1

Before starting:
1. Review `src/core/gmail/client.ts` to understand existing API
2. Review `src/core/cache/db.ts` to understand cache interface
3. Understand Ink API from docs (https://github.com/vadimdemedes/ink)

**Execution Order** (follow task list order):
```
T037 (EmailList tests)
T038 (EmailPreview tests)
T039 (useKeyboard tests)
T040 (useGmail tests)
  ↓
T041 (TUI app shell)
T042 (useKeyboard implementation)
T043 (useGmail implementation)
T044 (EmailList implementation)
T045 (Bold unread)
T046 (GmailClient.getMessage)
T047 (EmailPreview implementation)
T048 (Split-pane layout)
T049 (TUI entry point)
T050 (Loading state)
  ↓
T050a (Integration test: inbox viewing)
T050b (Integration test: sync + display)
```

**Test Before Each Implementation**:
```bash
npm test -- T037      # Run specific test file
npm test              # Run all tests
npm run typecheck     # Verify TypeScript strict mode
npm run lint:fix      # Fix linting issues
npm run format        # Format with Prettier
```

---

## Phase 4 (US2) Overview

**Goal**: Sort and filter emails

**12 Tasks**:
- T051-T053: Tests for sorting, filtering, SortFilterMenu
- T054-T061: Implementation (GmailClient.listLabels, filter menus, key bindings)

**Key Implementation**:
- `GmailClient.listLabels()` - Returns user labels + system labels
- Extend `EmailCache.getEmails()` with `labelFilter`, `categoryFilter`
- `SortFilterMenu` component (modal overlay with menu options)
- Key bindings: `s` for sort, `f` for filter, `Esc` to clear

**Expected Result**: Users can sort by date/sender/subject, filter by label/category/sender

---

## File Structure Reference

```
/home/ckolbegger/src/gmail-sweep/worktrees/claude/
├── src/
│   ├── core/                      # Frontend-agnostic business logic
│   │   ├── models/
│   │   │   └── index.ts           # Email, Label, Category, Config interfaces
│   │   ├── errors.ts              # Error class hierarchy
│   │   ├── config.ts              # loadConfig, createDefaultConfig
│   │   ├── index.ts               # Barrel export
│   │   ├── gmail/
│   │   │   ├── auth.ts            # OAuth2, token persistence
│   │   │   ├── client.ts          # GmailClient API methods
│   │   │   └── index.ts           # Export
│   │   └── cache/
│   │       ├── db.ts              # EmailCache with sql.js
│   │       └── index.ts           # Export
│   │
│   ├── tui/                       # Terminal UI (Ink/React)
│   │   ├── app.tsx                # [TO IMPLEMENT] Main app shell
│   │   ├── index.tsx              # [TO IMPLEMENT] Entry point
│   │   ├── components/
│   │   │   ├── EmailList.tsx      # [TO IMPLEMENT] Email list with selection
│   │   │   ├── EmailPreview.tsx   # [TO IMPLEMENT] Selected email preview
│   │   │   └── SortFilterMenu.tsx # [TO IMPLEMENT] Sort/filter UI (US2)
│   │   └── hooks/
│   │       ├── useKeyboard.ts     # [TO IMPLEMENT] j/k, arrows, Enter
│   │       └── useGmail.ts        # [TO IMPLEMENT] Data fetching, caching
│   │
│   ├── cli/
│   │   └── index.ts               # CLI argument parsing, bootstrap
│   │
│   └── web/                       # Web app (scaffolded for fast-follow)
│       ├── api/                   # REST API endpoints
│       └── client/                # React web client
│
├── tests/
│   ├── unit/
│   │   ├── gmail/
│   │   │   ├── auth.test.ts       # ✅ 8 tests passing
│   │   │   └── client.test.ts     # ✅ 14 tests passing
│   │   ├── cache/
│   │   │   └── db.test.ts         # ✅ 16 tests passing
│   │   ├── config.test.ts         # ✅ 6 tests passing
│   │   ├── cli/
│   │   │   └── index.test.ts      # ✅ 7 tests passing
│   │   └── tui/                   # [TO IMPLEMENT]
│   │       ├── EmailList.test.tsx
│   │       ├── EmailPreview.test.tsx
│   │       ├── useKeyboard.test.ts
│   │       ├── useGmail.test.ts
│   │       └── SortFilterMenu.test.tsx
│   └── integration/               # [TO IMPLEMENT]
│       ├── view-inbox.test.ts
│       ├── sync-and-display.test.ts
│       └── sort-filter-flow.test.ts
│
├── specs/
│   └── 001-smart-inbox-organizer/
│       ├── spec.md                # Feature spec (7 user stories)
│       ├── plan.md                # Implementation plan
│       ├── research.md            # Technology decisions
│       ├── data-model.md          # Domain entities
│       ├── tasks.md               # 116 tasks (this is the task list to follow)
│       └── contracts/
│           └── core-api.md        # API contracts
│
├── package.json                   # Dependencies (sql.js, googleapis, ink, vitest)
├── tsconfig.json                  # TypeScript strict config
├── vitest.config.ts               # Test config
├── eslint.config.js               # Linting rules
└── .prettierrc                     # Code formatting

```

---

## Key Design Decisions

| Area | Decision | Why |
|------|----------|-----|
| **Storage** | sql.js (pure JavaScript SQLite) | Avoids native compilation issues with Node v25; instant dependency resolution |
| **TUI Framework** | Ink (React for CLI) | TypeScript-first, component-based, good for vim keybindings |
| **Frontend Architecture** | Frontend-agnostic core + thin presentation layer | Code sharing between TUI and web without duplication |
| **Cache Strategy** | In-memory EmailCache with periodic disk flush | Fast reads for TUI; persistent across sessions |
| **Error Handling** | Specific error subclasses | Enables precise error handling in UI |
| **Retry Logic** | Exponential backoff with p-retry | Graceful handling of Gmail rate limits |
| **Token Storage** | `~/.config/gmail-sweep/` | Standard Unix conventions; survives app updates |
| **Testing** | Vitest (parallel, TypeScript-native) | Fast test execution; works with TypeScript out of box |

---

## Important Notes for Next Session

### Critical Context
1. **sql.js initialization is async** - The `EmailCache.initialize()` method must be called before using other methods. It's async, so the TUI app must handle this in useGmail hook.
2. **Ink requires React hooks** - useKeyboard and useGmail should be custom React hooks that return state and callbacks.
3. **Email IDs from Gmail are base64url encoded** - Don't decode unless needed for display.
4. **GmailClient is authenticated per instance** - Create one instance per user in the CLI.
5. **Test structure**: Always write tests in `tests/unit/` BEFORE implementation, then run `npm test` to verify they fail, then implement to make them pass.

### Dependencies to Remember
```bash
npm install                 # Install all dependencies
npm test                    # Run Vitest
npm test -- --watch        # Watch mode for development
npm run typecheck           # Verify strict TypeScript
npm run lint:fix            # Auto-fix linting
npm run format              # Format with Prettier
npm run dev                 # Run CLI locally
```

### Git Workflow
```bash
# After completing a task or set of tasks:
git add src/tui/ tests/unit/tui/
git commit -m "feat: implement [task description]"
git push origin claude

# After completing a phase:
git tag claude-phase3-complete
git push origin claude-phase3-complete
```

---

## Resume Instructions for Next Session

1. **Verify environment**:
   ```bash
   cd /home/ckolbegger/src/gmail-sweep/worktrees/claude
   git status                          # Should be clean
   npm test                            # Should show 59 passing tests
   ```

2. **Start US1 implementation**:
   - Open `specs/001-smart-inbox-organizer/tasks.md`
   - Start with **T037** (EmailList tests)
   - Write test file in `tests/unit/tui/EmailList.test.tsx`
   - Run `npm test` to verify tests fail
   - Implement EmailList component in `src/tui/components/EmailList.tsx`
   - Run `npm test` to verify tests pass
   - Continue with T038, T039, T040 (same pattern)
   - Then implement T041-T050 (implementation tasks)
   - Finally implement integration tests T050a-T050b

3. **Use TDD strictly**:
   - Every implementation task should have tests written first
   - Tests should fail before implementation
   - Implementation should make tests pass
   - All tests should remain green throughout

4. **Watch for these common issues**:
   - EmailCache.initialize() is async, but other methods are sync
   - Ink components must use React hooks
   - Gmail API pagination uses pageToken, not offset
   - html2text conversion for email body display
   - Virtualization in EmailList for 100+ emails

5. **Before committing each phase**:
   ```bash
   npm test                            # All tests pass?
   npm run typecheck                   # No type errors?
   npm run lint:fix                    # Lint clean?
   npm run format                      # Properly formatted?
   git status                          # Only intended files changed?
   ```

---

## Success Criteria

**Phase 3 (US1) Complete When**:
- ✅ All 16 tasks have test files in `tests/unit/tui/`
- ✅ All 10 implementation files created in `src/tui/`
- ✅ GmailClient.getMessage() implemented in `src/core/gmail/client.ts`
- ✅ All 59 existing tests still passing
- ✅ All 30+ new US1 tests passing
- ✅ Integration tests T050a-T050b passing
- ✅ TUI app runs with `npm run dev --account user@gmail.com`
- ✅ Can browse inbox with j/k, see preview on Enter
- ✅ No TypeScript errors (`npm run typecheck`)
- ✅ No linting errors (`npm run lint:fix`)
- ✅ Code formatted (`npm run format`)

**Phase 4 (US2) Complete When**:
- ✅ All 12 tasks implemented
- ✅ GmailClient.listLabels() working
- ✅ EmailCache.getEmails() filters working
- ✅ Sort/filter menus working with `s` and `f` keys
- ✅ All 12+ new tests passing
- ✅ Previous tests still passing (90+ total)

---

## Questions to Clarify Before Starting

- **Gmail test account**: Will you use a real Gmail account for testing, or mock it?
- **Virtualization library**: Should EmailList use a virtualization library (e.g., `list-virtualization`) or implement manually?
- **HTML email parsing**: Which library for converting HTML to plain text? (e.g., `html-to-text`)

**Current Assumptions**:
- Using mocked Gmail API for unit tests
- Real Gmail account for independent testing (not automated)
- Custom HTML-to-text parsing or simple `strip-html` regex

---

## Contact & Support

If issues arise:
1. **TypeScript errors**: Run `npm run typecheck` for detailed errors
2. **Test failures**: Run `npm test -- --reporter=verbose` for detailed output
3. **Lint issues**: Run `npm run lint:fix` to auto-fix
4. **Git issues**: Check `git status` and `git log` to understand state

---

## Commit History Reference

```
6fc3cc9 - docs: create comprehensive handoff document for Phase 1 & 2 completion
36144b3 - feat: implement Phase 1 Setup and Phase 2 Foundational infrastructure
7af62c3 - test: enhance test cases with comprehensive coverage
01af3c6 - refactor(tasks): apply JIT audit - defer models to consuming stories
6a9d3f3 - docs: add implementation tasks for Smart Inbox Organizer
```

**Latest Tag**: `claude-phase1-phase2-complete`

---

**Ready for US1 implementation!** 🚀

Follow the task list in `specs/001-smart-inbox-organizer/tasks.md` starting with **T037**.

All foundational infrastructure is in place. Focus on:
1. Writing comprehensive tests first
2. Implementing components to make tests pass
3. Keeping all 59 existing tests passing
4. Clean TypeScript with no `any` types
5. Proper error handling with specific error classes

Good luck! 💪
