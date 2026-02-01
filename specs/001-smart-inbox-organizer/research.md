# Research: Smart Inbox Organizer

**Date**: 2026-02-01 | **Branch**: `claude`

## Summary

This document captures technology decisions for the Smart Inbox Organizer TUI MVP. All NEEDS CLARIFICATION items from the implementation plan have been resolved.

---

## Decision 1: Programming Language

**Decision**: TypeScript 5.x with Node.js 20+

**Rationale**:
- Single language for TUI and web app enables code sharing
- Web app runs as single process (no separate API server + web server)
- Strong typing improves maintainability
- Excellent Gmail API client (googleapis)
- Modern async/await and ESM support
- Large ecosystem for both CLI and web development

**Alternatives Considered**:
- Python: Excellent libraries but web app would require separate API server process
- Go: Good CLI tooling but weaker TUI frameworks and web integration
- Rust: Performance overkill; slower development velocity

---

## Decision 2: TUI Framework

**Decision**: Ink (React for CLI)

**Rationale**:
- React component model familiar to web developers
- Same mental model as web frontend (shared knowledge)
- Built-in support for keyboard input handling
- Flexbox-style layout system
- Active maintenance by Vercel
- Good TypeScript support
- Hooks for state management (useState, useEffect)

**Alternatives Considered**:
- blessed/neo-blessed: More powerful but complex API, less TypeScript-friendly
- terminal-kit: Lower-level, more boilerplate
- Cliffy: Deno-focused, less Node.js ecosystem integration

**Key Capabilities**:
- Full keyboard event handling (vim keys, arrows, Enter)
- Box/Flexbox layout for split-pane views
- Text styling (bold for unread emails)
- Scrollable lists via ink-community components
- Fast re-rendering with React reconciliation

**Limitation**: Ink doesn't have built-in split-pane like Textual. We'll use:
- `ink-big-text` or custom Box layouts for panes
- `ink-select-input` or custom list for email navigation
- May need `@inkjs/ui` for advanced components

---

## Decision 3: Gmail API Integration

**Decision**: googleapis (official Google APIs Node.js client)

**Rationale**:
- Official Google library with guaranteed API compatibility
- Complete Gmail API v1 support (messages, threads, labels, attachments)
- Built-in OAuth2 support with local loopback redirect
- Automatic token refresh
- TypeScript definitions included
- Native pagination support
- Large community and extensive documentation

**Alternatives Considered**:
- gmail-api-node: Wrapper with less features, smaller community
- Direct REST calls: More work, no benefit

**Rate Limiting Strategy**:
Use `p-retry` library for exponential backoff:
```typescript
import pRetry from 'p-retry';

const result = await pRetry(
  () => gmail.users.messages.list({ userId: 'me', maxResults: 50 }),
  { retries: 5, minTimeout: 1000, maxTimeout: 60000 }
);
```

**Token Storage**:
- Store OAuth credentials in `~/.config/gmail-sweep/credentials.json`
- Store refresh tokens in `~/.config/gmail-sweep/token.json`
- Never log or expose tokens (Constitution I)

---

## Decision 4: Natural Language Classification

**Decision**: LLM API (Anthropic Claude or Google Gemini) for MVP

**Rationale**:
- Highest accuracy (85-95%) for semantic queries
- Meets latency requirement (<10s) with batch processing
- No training data required
- Flexible for complex queries ("find financial offers", "event promotions")
- Low setup friction for users
- Acceptable cost (~$0.50-1/month for typical usage)

**Libraries**:
- Anthropic: `@anthropic-ai/sdk`
- Google: `@google/generative-ai`

**Alternatives Considered**:
- Local LLM (Ollama): Zero cost but high setup complexity, resource-intensive
- Embeddings + Vector Search: Fast but lower accuracy (~70-80%), requires indexing
- Traditional ML: Requires training data, not flexible for open-ended queries

**Batch Processing Strategy**:
- Process 10-20 emails per API request
- Use system prompt for classification
- Cache results with query text hash for repeated queries

**Privacy Consideration**:
Email content sent to external API. Mitigations:
- Explicit user consent at first run
- Document data handling in privacy notice
- Future: Optional embeddings-only mode (local, lower accuracy)

---

## Decision 5: Storage

**Decision**: better-sqlite3 (local) + JSON config files

**Rationale**:
- better-sqlite3 is synchronous and fast (no async overhead for local DB)
- Works in Node.js (TUI and web server)
- JSON for configuration (OAuth client ID, user preferences, load size)
- No external database dependencies
- Portable (single file)

**Storage Locations**:
```
~/.config/gmail-sweep/
├── config.json          # User preferences
├── credentials.json     # OAuth client ID/secret
├── token.json           # OAuth refresh token
└── cache.db             # SQLite (email cache, saved queries)
```

**Alternatives Considered**:
- sql.js: WASM-based SQLite, slower than native better-sqlite3
- LevelDB: Key-value only, less flexible for queries
- Files only: Less structured, harder to query cached data

---

## Decision 6: Testing Framework

**Decision**: Vitest

**Rationale**:
- Fast, modern test runner with native ESM support
- Jest-compatible API (familiar to most JS developers)
- Built-in TypeScript support (no config needed)
- Watch mode with instant feedback
- Good mocking capabilities for Gmail API

**Test Structure**:
```
tests/
├── unit/           # Core library with mocked Gmail API
├── integration/    # End-to-end with real/simulated Gmail
└── contract/       # Core library API contracts
```

**Mocking Strategy**:
- Mock `googleapis` for unit tests
- Use Gmail API test fixtures for consistent test data
- Integration tests use real API with test account (optional)

---

## Decision 7: LLM Provider

**Decision**: Provider-agnostic with Anthropic Claude as default

**Rationale**:
- Abstract LLM calls behind interface for flexibility
- Anthropic Claude: Strong reasoning, good cost/performance
- Alternative: Google Gemini (fast, cheap, good for Gmail integration)
- User can configure preferred provider via config

**Interface**:
```typescript
interface EmailClassifier {
  classify(query: string, emails: Email[]): Promise<ClassificationResult[]>;
}
```

**Implementations**:
- `ClaudeClassifier` (default)
- `GeminiClassifier` (alternative)
- `EmbeddingClassifier` (Phase 2, local fallback)

---

## Decision 8: Web App Architecture

**Decision**: Single Express server serving API + static frontend

**Rationale**:
- User starts one process: `gmail-sweep web`
- Express serves React frontend at `/`
- Express serves API at `/api/*`
- Core library imported directly (no HTTP for business logic)
- Simple deployment: single Node.js process

**Structure**:
```
src/web/
├── server.ts       # Express app
├── api/            # API route handlers (thin wrappers around core)
└── client/         # React frontend (Vite build)
    ├── src/
    └── dist/       # Built static files served by Express
```

**Alternatives Considered**:
- Next.js: More complex, SSR not needed for local app
- Separate frontend/backend: Requires two processes (user rejected)
- Electron: Heavier, not needed for localhost web app

---

## Resolved Technical Context

| Item | Resolution |
|------|------------|
| Language/Version | TypeScript 5.x / Node.js 20+ |
| Primary Dependencies | Ink, googleapis, @anthropic-ai/sdk, p-retry |
| Storage | better-sqlite3 + JSON config files |
| Testing | Vitest |
| Target Platform | Terminal/CLI + localhost web (Linux, macOS, Windows) |
| Project Type | Single project (core/ + tui/ + web/) |
| Performance Goals | <5s inbox load, <10s NL search |
| Constraints | Single account, localhost, confirmation for destructive actions |
| Scale/Scope | Single user, personal inbox |
