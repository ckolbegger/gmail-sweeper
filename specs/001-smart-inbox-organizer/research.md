# Research & Technical Decisions: Smart Inbox Organizer

**Feature**: `001-smart-inbox-organizer`
**Date**: 2026-01-31

## 1. CLI Authentication Flow

**Problem**: How to securely and conveniently authenticate the user with Gmail API in a CLI environment.
**Decision**: Use `google-auth-library` with a temporary local loopback server.
**Rationale**: 
- A local server (e.g., `http://localhost:3000/oauth2callback`) allows the browser to redirect automatically, eliminating the error-prone "copy-paste code" step.
- `google-auth-library` is the official, maintained library.
**Alternatives**: 
- **Copy-Paste Code (OOB)**: Deprecated by Google for many client types; bad UX.
- **Device Flow**: Good for headless, but loopback is better for desktop CLIs with browsers.

## 2. Gemini Integration

**Problem**: How to integrate the latest Gemini 3 Flash model for natural language processing.
**Decision**: Use official `@google/generative-ai` SDK targeting the `gemini-3-flash` model.
**Rationale**:
- Provides typed interfaces for the Gemini API.
- Supports `generateContent` with system instructions (crucial for defining the "filter" behavior).
- Simplifies API key management.

## 3. TUI Testing Strategy

**Problem**: How to strict-TDD a visual TUI application.
**Decision**: Use `vitest` + `ink-testing-library`.
**Rationale**:
- `ink-testing-library` allows rendering Ink components in memory and asserting on the text output (frames).
- `vitest` is fast, ESM-native, and works seamlessly with TypeScript.
- **Approach**:
    - **Logic**: Unit test `services/` with mocked dependencies.
    - **UI**: Component test `components/` checking rendered text for given props.
    - **Integration**: Test the `App` component with mocked services to verify wiring.

## 4. Local Persistence

**Problem**: Where and how to store "Workflows".
**Decision**: `conf` (or similar simple JSON store) pointing to `~/.config/gmail-sweep/`.
**Rationale**:
- Handles cross-platform config paths automatically (`XDG_CONFIG_HOME` on Linux).
- Simple `get`/`set` API.
- JSON format is human-readable as required by spec.
