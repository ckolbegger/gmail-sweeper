# Research: Smart Email Filter

**Feature**: 002-smart-email-filter
**Date**: 2026-02-14

## R1: AI Provider Abstraction (Anthropic + OpenAI-compatible)

**Decision**: Create a provider-agnostic `AiProvider` interface with two implementations: `AnthropicProvider` and `OpenAiProvider`.

**Rationale**:
- The spec requires configurable AI providers supporting Anthropic and OpenAI-compatible APIs (FR-015/FR-016)
- Both APIs follow a similar request/response pattern (messages in, text out) but differ in SDK, authentication, and message format
- An interface abstraction keeps business logic decoupled from provider specifics
- `@anthropic-ai/sdk` v0.20 is already installed; `openai` SDK needs to be added

**Alternatives Considered**:
- **Single SDK (e.g., LangChain)**: Rejected — adds heavy dependency for a simple classification task. YAGNI.
- **Raw HTTP calls**: Rejected — reinventing auth, retries, streaming that SDKs handle
- **Anthropic-only**: Rejected — spec explicitly requires OpenAI-compatible support

**Implementation Notes**:
- Provider selected via `AI_PROVIDER` env var (`anthropic` | `openai`)
- Model selected via `AI_MODEL` env var (e.g., `claude-sonnet-4-5-20250929`, `gpt-4o`)
- API key via `AI_API_KEY` env var
- OpenAI-compatible endpoint via `AI_BASE_URL` env var (enables Ollama, Azure, etc.)
- Factory function `createAiProvider(config)` resolves provider from config

## R2: Batch Evaluation Strategy

**Decision**: Evaluate emails in dynamically-sized batches determined by a configurable token budget. Show partial results as each batch completes.

**Rationale**:
- FR-014 requires progressive batch evaluation with partial results
- Sending one LLM call per email is too slow and expensive (50 API calls for 50 emails)
- A single structured prompt with multiple emails gets a structured JSON response classifying each
- SC-001 requires results within 10 seconds for 50 emails — a single batch call achieves this
- **Fixed batch sizes are unsafe**: email metadata varies in length, and models have different context windows (128k for Claude Opus, 8k for some local Ollama models). A fixed count of 50 could overflow small models or waste capacity on large ones.

**Alternatives Considered**:
- **One call per email**: Rejected — too slow (50+ seconds), too expensive
- **All emails in one call**: Rejected — context window limits for large inboxes, no progressive results
- **Parallel individual calls**: Rejected — rate limiting, still expensive
- **Fixed batch of 50**: Rejected — no context window guard; fails silently on small models

**Implementation Notes**:
- **Token budget**: Configurable via `AI_MAX_CONTEXT_TOKENS` env var (default: 32000)
- **Budget allocation**: ~30% reserved for system prompt + filter description + response overhead. Remaining 70% available for email metadata.
- **Token estimation**: Approximate `chars / 4` for each email's metadata (subject + sender + snippet)
- **Dynamic batch size**: Calculate how many emails fit in the available token budget. Could be 50 for short emails on a large model, or 10 for verbose emails on a small model.
- **Minimum batch size**: Always at least 1 email per batch (even if a single email is large)
- Prompt template includes the filter description and a JSON array of email metadata (id, subject, sender, snippet)
- Response is structured JSON: `[{ emailId, matches, confidence, reasoning }]`
- Use system prompt to enforce JSON output format

## R3: Confidence Level Mapping

**Decision**: Map numeric confidence scores (0.0–1.0) from the LLM to discrete levels: high (≥0.8), medium (≥0.5), low (<0.5).

**Rationale**:
- FR-011 requires high/medium/low confidence levels
- The existing `ClassificationResult` model already uses numeric confidence (0.0–1.0)
- Discrete levels are more user-friendly in the TUI
- Thresholds are simple and intuitive

**Alternatives Considered**:
- **Only discrete levels from LLM**: Rejected — numeric scores give more flexibility for sorting (FR-012)
- **Five-level scale**: Rejected — three levels sufficient per spec, YAGNI

## R4: TUI Filter Integration

**Decision**: Add filter state to the existing `InboxApp` component. Use `f` key to activate filter input, `Escape` to clear. Filter state managed via a new `useSmartFilter` hook.

**Rationale**:
- FR-001/FR-007 require keyboard shortcuts for activate/clear
- FR-002 requires a text input field
- The existing TUI uses Ink with hooks pattern — a new hook fits naturally
- Filter is a view-layer concern: it filters the email list without modifying underlying data

**Implementation Notes**:
- `useSmartFilter` hook manages: filter description, filtered results, loading state, error state
- When active, `InboxApp` passes filtered emails to `EmailList` instead of full list
- Filter input renders as a text field at the top of the screen (replaces header temporarily)
- Status bar shows "Filtered: 12/50 emails" when active
- `Escape` clears filter and restores full list from existing state (no re-fetch)

## R5: Error Handling & No-Config State

**Decision**: When no AI provider is configured, display a clear error message on filter activation. When AI calls fail, show error and preserve unfiltered view.

**Rationale**:
- FR-017 requires clear error when unconfigured
- FR-010 requires graceful error handling preserving current view
- Constitution I (Safety) — never lose user's current view state on error

**Implementation Notes**:
- Check for `AI_PROVIDER` and `AI_API_KEY` env vars before attempting filter
- On missing config: show inline error "Smart filter requires AI configuration. Set AI_PROVIDER and AI_API_KEY environment variables."
- On API error: show error in status bar, keep current (unfiltered) email list
- On empty description (FR-013): reject immediately, don't call API

## R6: Config Model Update

**Decision**: Update the `Config` interface to replace `llmProvider: 'claude' | 'gemini'` with the new provider scheme using environment variables.

**Rationale**:
- Current config has `llmProvider` and `llmApiKeyEnv` fields that don't match the spec's requirement for Anthropic + OpenAI-compatible providers
- Environment variables are simpler and align with standard AI SDK conventions
- The spec says "environment variables or configuration file" (FR-016)

**Implementation Notes**:
- Primary config via env vars: `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`
- Config file can also specify these as fallback
- Update `Config` type: `aiProvider?: 'anthropic' | 'openai'`, `aiModel?: string`, `aiApiKey?: string`, `aiBaseUrl?: string`
- Preserve backward compatibility: existing `llmProvider: 'claude'` maps to `aiProvider: 'anthropic'`
