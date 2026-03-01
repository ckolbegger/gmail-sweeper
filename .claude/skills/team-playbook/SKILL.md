# Team Playbook

**Type:** Team Lead Reference
**Purpose:** Decision rules for the team lead (orchestrator) to coordinate task agents, commit agent, and tester agents during feature implementation

**When to read this:** At the start of any team-based implementation session. The team lead MUST follow these rules when deciding what to dispatch and when.

## Team Roles

| Role | Skill | Count | Purpose |
|------|-------|-------|---------|
| **Task Agent** | `tdd-task-parallel` | 1–5 (parallel) | Implement a single task using TDD |
| **Commit Agent** | `tdd-commit` | 1 (singleton) | Run full test suite and commit |
| **Acceptance Tester** | `tui-acceptance-tester` | 1 per story | Verify spec acceptance scenarios via tmux |
| **Exploratory Tester** | `tui-exploratory-tester` | 1 per story | Find edge cases and bugs via tmux |

All agents are `general-purpose` subagents given the appropriate skill to follow.

## Skill Locations

```
.claude/skills/tdd-task-parallel/SKILL.md    — Parallel TDD task implementation
.claude/skills/tdd-commit/SKILL.md           — Test suite validation + git commit
.claude/skills/tui-acceptance-tester/SKILL.md — Acceptance scenario testing
.claude/skills/tui-exploratory-tester/SKILL.md — Exploratory/adversarial testing
```

## Implementation Pipeline

```
Phase Start
  │
  ├─ Identify parallelizable tasks (marked [P] in tasks.md)
  │
  ▼
┌─────────────────────────────────┐
│  DISPATCH: Task Agents (parallel)│
│  Up to N tasks simultaneously    │
│  Each follows tdd-task-parallel  │
└────────────┬────────────────────┘
             │ All agents report back
             ▼
┌─────────────────────────────────┐
│  RESOLVE: Shared file updates    │
│  Barrel exports, type files      │
│  Lead makes these edits          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│  DISPATCH: Commit Agent (serial) │
│  One commit request per task     │
│  Each runs full test suite       │
│  Commit on green, report on red  │
└────────────┬────────────────────┘
             │ All tasks committed?
             │
     ┌───────┴───────┐
     │ YES           │ NO (test failures)
     ▼               ▼
  Next batch     DISPATCH: Fix Agent
  or story       (tdd-task-parallel on
  checkpoint     the failing task)
                     │
                     └──▶ back to Commit Agent
```

## Story Completion Pipeline

```
All story tasks committed and green
  │
  ▼
┌─────────────────────────────────┐
│  DISPATCH: Acceptance Tester     │
│  Runs spec scenarios via tmux    │
└────────────┬────────────────────┘
             │
     ┌───────┴───────┐
     │ 0 bugs        │ Bugs found
     ▼               ▼
┌──────────────┐  LEAD: Register bug tasks (B001, B002...)
│  DISPATCH:    │  in tasks.md under "Bug Fixes for USx"
│  Exploratory  │     │
│  Tester       │     ▼
└──────┬───────┘  DISPATCH: Fix Agent(s)
       │          one per bug task
   ┌───┴───┐          │
   │0 bugs │          ▼
   │       │      Commit Agent (commits bug fixes)
   ▼       ▼          │
STORY    LEAD:        ▼
DONE     Register  Re-run Acceptance Tester
         bug tasks (restart story completion pipeline)
              │
              ▼
         DISPATCH: Fix Agent(s)
              │
              ▼
         Commit Agent
              │
              ▼
         Re-run Acceptance Tester
         (restart story completion pipeline)
```

## Task Tracking Responsibilities

### The lead MUST maintain tasks.md throughout execution

The tasks.md file is the single source of truth for progress. The commit agent marks individual tasks `[x]` when committing, but the lead is responsible for all other updates.

### Bug Task Registration

When a tester (acceptance or exploratory) reports bugs, the lead MUST:

1. **Read the bug report file** written by the tester
2. **Add a bug task** to tasks.md in the current story's phase with ascending bug IDs: `B001`, `B002`, etc.
3. **Dispatch a fix agent** for the bug task

Bug tasks follow this format in tasks.md:

```markdown
### Bug Fixes for User Story 1

- [ ] B001 [US1] Fix: match count not displayed when filter active — see specs/002-smart-email-filter/US1-bug-1.md
- [ ] B002 [US1] Fix: overlapping evaluations on double filter activation — see specs/002-smart-email-filter/US1-bug-2.md
```

**Bug numbering is global** — B001, B002, B003 across all stories, not per-story. This avoids confusion when referencing bug tasks.

**Before adding a bug task**, check the current highest bug number:
```bash
grep -oP 'B\d+' specs/{feature}/tasks.md | sort -t'B' -k1 -n | tail -1
```

### Phase and Story Status Tracking

After each commit agent cycle, the lead updates the phase status:

- Count completed tasks vs total in the phase
- Identify newly unblocked tasks (dependencies resolved)
- Determine if the phase checkpoint has been reached
- If checkpoint reached, decide next action (next batch, testers, or next phase)

### Task Dependency Tracking

When a task agent reports BLOCKED or the commit agent reports failures:

1. Do NOT mark the task `[x]` — it stays `[ ]`
2. Note the blocker in tasks.md if useful (append `— BLOCKED: {reason}`)
3. Dispatch fix agent or resolve the issue
4. Once fixed and committed, remove the BLOCKED annotation

## Decision Rules

### When to dispatch task agents

- **Parallel batch**: Tasks marked `[P]` in the same phase that touch different files
- **Max concurrency**: User preference (default: 3 parallel agents)
- **Sequential tasks**: Tasks NOT marked `[P]`, or tasks that depend on each other — run one at a time via commit agent between each

### When to dispatch the commit agent

- After a task agent reports success
- Send one commit request at a time (commit agent is a singleton)
- Include the file list and any shared file updates needed
- Wait for commit agent response before sending the next

### When to dispatch acceptance tester

- **Trigger**: ALL tasks in a user story phase are committed AND test suite is green
- **Never when**: Any story task is still in progress, blocked, or has uncommitted failures
- **Input**: The user story ID (e.g., US1) + tasks file path

### When to dispatch exploratory tester

- **Trigger**: Acceptance tester completed with 0 bugs found
- **Never when**: Acceptance bugs exist unfixed
- **Input**: The user story ID (e.g., US1) + tasks file path

### When to dispatch fix agents

- **Trigger**: Commit agent reports test failures, OR acceptance/exploratory tester reports bugs
- **Before dispatching for UI bugs**: Lead MUST first register bug tasks (B001, B002...) in tasks.md
- **Input**: For test failures — the failure details from commit agent report. For UI bugs — the bug task ID and bug report file path (e.g., "Fix B001 per specs/002-smart-email-filter/US1-bug-1.md").
- **Fix agents use**: `tdd-task-parallel` skill, scoped to fixing the specific issue
- **After fix**: Send back through commit agent (full suite validation, marks Bxxx `[x]` in tasks.md)

### When a story is DONE

A story is complete when:
1. All story tasks (Txxx) are committed ✅
2. All bug tasks (Bxxx) for this story are committed ✅
3. Acceptance tester: 0 bugs on latest run ✅
4. Exploratory tester: 0 bugs on latest run ✅

Report to user: "US1 complete — all tasks committed, acceptance and exploratory testing passed."

## Phase Execution Example

```
Lead: "Implementing Phase 2 (Foundational) with 3 parallel agents"

1. Spawn task agents for T007, T008, T009 (all [P], different test files)
2. T007 agent reports: ✅ done, files: confidence.test.ts, provider.ts
3. T008 agent reports: ✅ done, files: config.test.ts, config.ts
4. T009 agent reports: ✅ done, files: provider.test.ts, provider.ts
   ⚠️ CONFLICT: T007 and T009 both created provider.ts
   → Lead resolves: T007 created provider.ts, T009 added factory to it
   → Lead merges the changes manually or dispatches a fix agent

5. Send to commit agent: "Commit T007: confidence.test.ts, provider.ts"
   Commit agent: npm test → ✅ 107/107 → committed a1b2c3d

6. Send to commit agent: "Commit T008: config.test.ts, config.ts"
   Commit agent: npm test → ✅ 109/109 → committed d4e5f6a

7. Send to commit agent: "Commit T009: provider.test.ts, provider.ts (updated)"
   Commit agent: npm test → ❌ 2 failures in provider.test.ts
   → Lead dispatches fix agent for T009 failures
   → Fix agent reports: ✅ fixed
   → Send to commit agent again: "Commit T009: ..."
   → Commit agent: npm test → ✅ 112/112 → committed b7c8d9e

8. Phase 2 complete. Move to Phase 3 (US1).
```

## Reporting to User

After each phase or story completion, report:

```
Phase 2 (Foundational) Complete

Tasks: 11/11 committed
Commits: T007 (a1b2c3d), T008 (d4e5f6a), T009 (b7c8d9e), ...
Test Suite: 112/112 passing
Fixes Required: 1 (T009 — provider factory conflict)

Ready for Phase 3 (US1). Proceed?
```

After story completion:

```
US1 (Filter Inbox by Natural Language) Complete

Tasks: 16/16 committed
Bug Fixes: 2/2 committed (B001, B002)
Acceptance Testing: 4/4 scenarios passed (clean after bug fixes)
Exploratory Testing: 18 explorations, 0 bugs, 1 concern noted
Test Suite: 149/149 passing

Concern: Selection position not preserved after filter clear (minor UX)

Ready for US2. Proceed?
```
