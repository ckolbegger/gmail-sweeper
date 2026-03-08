# Implementation Plan: AI Summary

**Branch**: `006-gemini-ai-summary` | **Date**: March 7, 2026 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-gemini-ai-summary/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add an interactive feature to the email detail view allowing users to press 's' to generate and display an AI-powered summary (one-sentence description + action items) for the selected email. The summary should be persisted locally to prevent redundant LLM calls and allow instant toggling between full and summary views.

## Technical Context

**Language/Version**: TypeScript 5.3+ (Node.js 20 LTS)
**Primary Dependencies**: React, Ink, existing `AiProvider` abstractions
**Storage**: Local JSON file (`~/.config/gmail-sweep/summaries.json`)
**Testing**: vitest (Unit/Integration)
**Target Platform**: CLI/TUI (Linux/macOS)
**Project Type**: CLI Application
**Performance Goals**: <100ms toggle time between views for cached summaries
**Constraints**: Handle LLM rate limits and token limits gracefully
**Scale/Scope**: Manage summaries for local user inbox (10s to 100s of emails)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Safety & Security**: Read-only operations for Gmail data. The LLM only receives email content, no state mutations are performed on the remote server. No credentials exposed. (PASS)
- **Strict TDD**: All new services (SummaryService, AiProvider extensions) and UI components must have failing tests written first. (PASS)
- **Modular Architecture**: We will extend the existing `AiProvider` interface and create a dedicated `SummaryStorage` service, keeping logic separated from the UI. (PASS)
- **CLI Excellence**: The interaction model ('s' key toggle) fits standard TUI patterns. Feedback will be clear (loading states, errors). (PASS)

## Project Structure

### Documentation (this feature)

```text
specs/006-gemini-ai-summary/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── Inbox/
│       └── EmailDetail.tsx (Update to handle summary view toggle)
├── hooks/
│   └── useSummary.ts       (New hook for summary state management)
├── services/
│   ├── ai/
│   │   ├── provider.ts     (Extend with summarize method)
│   │   ├── gemini.ts       (Implement summary logic)
│   │   ├── openai.ts       (Implement summary logic)
│   │   └── anthropic.ts    (Implement summary logic)
│   └── storage/
│       └── summaryStore.ts (New service to persist summaries locally)
├── types/
│   ├── index.ts
│   └── interfaces.ts
└── app.tsx                 (Update to pass AiProvider to EmailDetail)

tests/
├── integration/
│   └── summary-flow.test.tsx (Test the TUI flow)
└── unit/
    ├── useSummary.test.ts
    ├── summaryStore.test.ts
    └── services/
        └── ai/
            └── provider.test.ts
```

**Structure Decision**: Single project structure extending existing services and components.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
