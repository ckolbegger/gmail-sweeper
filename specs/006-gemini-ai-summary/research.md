# Phase 0: Research & Architecture

## Unknowns & Clarifications

### 1. Persistent Storage for Summaries
- **Decision**: Use a local JSON file (`~/.config/gmail-sweep/summaries.json`).
- **Rationale**: The specification requires summaries to be persisted to avoid redundant LLM calls. A local JSON file is simple, requires no external dependencies, and aligns with the existing configuration approach (e.g., `~/.config/gmail-sweep/workflows.json` from earlier features).
- **Alternatives considered**: In-memory storage (fails the persistence requirement across application restarts), SQLite (overkill for this scale and adds native dependencies).

### 2. LLM Integration
- **Decision**: Extend the existing `AiProvider` interface in `src/services/ai/provider.ts` with a `summarizeEmail` method.
- **Rationale**: The project already has an abstraction layer for AI providers (Gemini, OpenAI, Anthropic) used for smart filtering. Reusing this abstraction ensures consistency and allows the summary feature to work with whichever provider the user has configured.
- **Alternatives considered**: Creating a new independent LLM service (would duplicate configuration and connection logic), directly calling an API from the UI component (violates modular architecture principles).

### 3. Prompt Engineering & Format Enforcement
- **Decision**: Instruct the LLM to output JSON matching a specific schema, or use structured output parsing (if the provider supports it), to ensure the "one-sentence description + bulleted action items" format.
- **Rationale**: Strict formatting is a functional requirement (FR-004). Returning structured JSON allows the UI to reliably render the description and action items without brittle string parsing.
- **Alternatives considered**: Asking for plain text formatted in a specific way and using regex to extract parts (prone to failure if the LLM deviates slightly).

### 4. Handling Long Emails
- **Decision**: Truncate the email body to fit within a safe limit before sending it to the LLM.
- **Rationale**: Emails can exceed the context window of standard LLMs. Truncating ensures the request succeeds, even if it loses some context at the end.
- **Alternatives considered**: Implementing chunking and map-reduce summarization (adds significant complexity and latency, overkill for typical email use cases).
