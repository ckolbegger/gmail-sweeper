# Phase 0: Research & Decisions

**Feature**: Smart Inbox Organizer (`001-smart-inbox-organizer`)

## 1. Tech Stack Pivot: TypeScript & Ink
**Problem**: User requires a path to a Web App. Python TUI (Textual) logic is hard to port to a React Web App.
**Decision**: **TypeScript + Ink**.
**Rationale**:
- **Ink** is a React renderer for the terminal.
- We can use the same State Management (Zustand/Context) and Custom Hooks (`useGmail`, `useLLM`) for both TUI and Web.
- **Shared Code**: ~70-80% (Logic, Data, Hooks).
- **Unique Code**: ~20-30% (View Components: `<Text>` vs `<div>`).

## 2. Gmail API Integration
**Library**: `googleapis` (official Node.js client).
**Auth**: `google-auth-library`.
**Strategy**:
- Use `OAuth2Client` to generate auth URL.
- In TUI, ask user to paste code (or spin up local express server for callback if feasible in CLI - Copy/Paste is safer/simpler for MVP).
- Fetch emails and cache in `better-sqlite3` to avoid rate limits and improve TUI speed.

## 3. LLM Provider Pattern
**Libraries**:
- `openai` (Official SDK)
- `@google/generative-ai` (Gemini SDK)
**Design**:
- Interface `LLMProvider` with method `classifyBatch(emails: Email[], prompt: string): Promise<MatchResult[]>`.
- MVP: Use Gemini 1.5 Flash (fast/cheap) for classification.

## 4. Testing Strategy
**Framework**: `vitest`.
**Component Testing**: `ink-testing-library` for TUI components.
**Logic Testing**: Standard unit tests for Hooks and Services.
**Mocking**: `msw` (Mock Service Worker) for intercepting HTTP calls to Gmail/LLM APIs.