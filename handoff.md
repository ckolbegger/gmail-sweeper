# Handoff: Smart Inbox Organizer (001-smart-inbox-organizer)

## Scope and Goal

This repository is implementing the feature in `specs/001-smart-inbox-organizer/`.
The target is a TypeScript CLI/TUI Gmail organizer with:

- US1: browse/filter inbox
- US2: natural language query (Ollama)
- US3: email actions (label/archive/delete)
- US4: saved workflows
- US5: automated session workflows

Primary planning documents:

- `specs/001-smart-inbox-organizer/plan.md`
- `specs/001-smart-inbox-organizer/tasks.md`

## Current State (What Is Done)

## Phase 1-2 Foundations: Mostly Implemented

Implemented infrastructure and contracts are present:

- Project/tooling: `package.json`, `tsconfig.json`, ESLint/Prettier/Vitest config files.
- Persistence:
  - `src/core/persistence/database.ts`
  - `src/core/persistence/migrations/001_initial.sql`
- Core models currently implemented:
  - `src/core/models/email.ts`
  - `src/core/models/label.ts`
  - `src/core/models/validation.ts`
  - `src/core/models/index.ts`
- Core contracts present:
  - `src/core/contracts/gmail-api.ts`
  - `src/core/contracts/nl-query.ts`
  - `src/core/contracts/workflow.ts`
  - `src/core/contracts/types.ts`
  - `src/core/contracts/index.ts`
- Error/logging scaffolding:
  - `src/core/errors/index.ts`
  - `src/core/logging/index.ts`

## US1 Backend/Core: Largely Implemented

- Auth + Gmail:
  - `src/core/services/auth-manager.ts`
  - `src/core/services/gmail-client.ts`
- Data services:
  - `src/core/services/email-repository.ts`
  - `src/core/services/label-repository.ts`
- Sorting/filtering:
  - `src/core/services/email-sorter.ts`
  - `src/core/services/email-filter.ts`

## US1 CLI: Structure Exists, Integration Incomplete

- CLI shell and components exist:
  - `src/cli/app.tsx`
  - `src/cli/index.ts`
  - `src/cli/components/email-list.tsx`
  - `src/cli/components/email-detail.tsx`
  - `src/cli/hooks/use-keyboard.ts`

Important gap: `src/cli/app.tsx` still uses a simulated startup flow (`setTimeout`) and does not fully wire real auth/sync/repository data through the UI.

## Tests Already Present

- Unit/core:
  - `tests/unit/core/gmail-client.test.ts`
  - `tests/unit/core/auth-manager.test.ts`
  - `tests/unit/core/email-repository.test.ts`
  - `tests/unit/core/label-repository.test.ts`
  - `tests/unit/core/email-sort-filter.test.ts`
- Unit/cli:
  - `tests/unit/cli/email-list.test.ts`
  - `tests/unit/cli/email-detail.test.ts`
  - `tests/unit/cli/use-keyboard.test.ts`
- Contract/integration/e2e:
  - `tests/contract/gmail-client.test.ts`
  - `tests/integration/email-list.test.ts`
  - `tests/e2e/us1-browse-filter.test.ts`

## Current State (What Is Not Done Yet)

## US2 (Natural Language Search)

Contracts are present, implementations are not.

Missing implementation files include:

- `src/core/services/ollama-client.ts`
- `src/core/services/nl-query-engine.ts`
- `src/core/services/query-repository.ts`
- `src/cli/components/query-input.tsx`

Likely also missing model file from tasks:

- `src/core/models/query.ts`

## US3 (Email Actions)

Planned items in `tasks.md` are not fully represented yet:

- `src/core/services/selection-service.ts`
- `src/cli/components/action-dialog.tsx`
- Full action flow wiring in `src/cli/app.tsx` (selection state, confirmation, progress)

## US4 (Saved Workflows)

Workflow contracts exist, but implementation is missing:

- `src/core/models/workflow.ts`
- `src/core/services/workflow-repository.ts`
- `src/core/services/workflow-engine.ts`
- `src/cli/components/workflow-list.tsx`
- `src/cli/components/workflow-save-dialog.tsx`

## US5 (Automated Session Workflows)

Not implemented yet:

- `src/core/models/session.ts`
- Migration `src/core/persistence/migrations/002_add_sessions.sql`
- `src/core/services/session-repository.ts`
- `src/core/services/session-service.ts`
- `src/core/services/execution-repository.ts`
- Session startup prompt/progress UI components

## Phase 8 Polish/Delivery

Not started or not visible yet:

- `scripts/build-binary.ts` (scripts directory currently empty)
- `docs/architecture.md` (docs directory currently absent)
- Final reliability/perf/security hardening tasks in `tasks.md`

## What To Do Next (Recommended Execution Order)

Use this as the highest-value path to resume quickly.

1. Complete US1 integration gaps in `src/cli/app.tsx`
   - Replace simulated startup with real auth/sync/repo loading.
   - Ensure list/detail reflect synchronized data and error states.
2. Implement US2 end-to-end (MVP-critical)
   - Add `Query` model, Ollama wrapper, NL query engine, query repository, query input UI.
   - Wire query execution to list filtering and status display.
3. Implement US3 end-to-end (MVP-critical)
   - Add selection service + keyboard shortcuts + action dialog + batch progress.
   - Wire label/archive/delete actions and UI confirmations.
4. Run MVP validation (US1+US2+US3)
   - Typecheck, tests, and basic manual flow checks.
5. Then proceed to US4, US5, and Phase 8 in order from `tasks.md`.

## Suggested Task Mapping (Immediate)

Use these `tasks.md` blocks first:

- US1 integration completion: T039-T042 (plus T132 check)
- US2 full slice: T043-T059 (plus T133)
- US3 full slice: T060-T074 (plus T134)

## Resume Checklist for New Claude Instance

1. Read:
   - `specs/001-smart-inbox-organizer/plan.md`
   - `specs/001-smart-inbox-organizer/tasks.md`
2. Confirm implementation snapshot by scanning:
   - `src/core/services/`
   - `src/cli/`
   - `tests/`
3. Start with the US1 integration gap in `src/cli/app.tsx`.
4. Follow strict TDD from `tasks.md`:
   - Write failing tests first for each story increment.
5. After each increment, run:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`

## Known Risks / Attention Points

- Architecture drift risk: contracts (`nl-query.ts`, `workflow.ts`) are ahead of concrete implementations.
- UI/backend coupling risk: current CLI view exists but is not fully connected to live sync flow.
- Scope risk: `tasks.md` checkboxes are all unchecked, so it is not a reliable completion tracker; use file/test evidence instead.
- Performance/security work is mostly deferred to Phase 8; avoid claiming production readiness until those tasks are done.

## Useful Anchors for Context

- Core public exports: `src/core/index.ts`
- Feature plan: `specs/001-smart-inbox-organizer/plan.md`
- Detailed execution backlog: `specs/001-smart-inbox-organizer/tasks.md`

## Handoff Summary

Foundation and much of US1 backend are in place. The fastest path is to finish US1 UI integration, then implement US2 and US3 to reach the planned MVP checkpoint, and only then continue into workflows (US4/US5) and polish.
