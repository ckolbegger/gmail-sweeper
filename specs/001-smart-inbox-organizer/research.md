# Research Summary: Smart Inbox Organizer

## Decision 1: Language and runtime
- **Decision**: Node.js 20 + TypeScript 5.x
- **Rationale**: Strong TypeScript ecosystem for CLI apps and Gmail integrations; cross-platform support.
- **Alternatives considered**: Python, Go

## Decision 2: TUI framework
- **Decision**: Ink
- **Rationale**: Mature React-based TUI toolkit with good input and layout support across platforms.
- **Alternatives considered**: Blessed, Neo-blessed

## Decision 3: Gmail integration library
- **Decision**: googleapis
- **Rationale**: Official Node client with broad Gmail API support and stable auth flows.
- **Alternatives considered**: Raw REST calls

## Decision 4: Local persistence
- **Decision**: SQLite file (metadata only)
- **Rationale**: Lightweight local storage for saved queries and session metadata; avoids storing email content.
- **Alternatives considered**: JSON files

## Decision 5: Web app process model
- **Decision**: Single local process that serves both UI and API
- **Rationale**: Avoids users starting multiple processes while still enabling a browser UI to call local APIs.
- **Alternatives considered**: Separate UI and API processes; no API layer at all

## Decision 6: Scope and scale assumptions
- **Decision**: Single-user, single inbox per session; support inboxes up to 100k messages via pagination
- **Rationale**: Matches MVP scope and typical large personal inbox sizes without over-optimizing.
- **Alternatives considered**: Multi-account support; no defined scale
