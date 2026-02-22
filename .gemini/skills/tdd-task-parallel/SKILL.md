---
name: tdd-task-parallel
description: Implement a single task using strict TDD workflow, designed for parallel execution.
---

# TDD Task Implementor (Parallel-Safe)

**Type:** Project Managed Skill
**Purpose:** Implement a single task using strict TDD workflow, designed for parallel execution alongside other task agents

**⚠️ IMPORTANT:** This skill should be invoked via the Task tool (subagent). Multiple instances can run concurrently on tasks that touch different files.

**⚠️ PARALLEL EXECUTION:** This variant is safe for parallel execution because it:
- Does NOT commit to git (orchestrator handles commits after all parallel tasks complete)
- Does NOT update the progress file (orchestrator marks tasks complete)
- Only runs the task's own test file, not the full suite (avoids cross-agent interference)
- Reports file conflicts so the orchestrator can resolve them

**Recommended Usage Pattern:**
```
User: "Implement T007-T011 in parallel"
Main Loop: Launches multiple subagents simultaneously:
  Task 1: "Execute /tdd-task-parallel T007 --progress-file specs/002/tasks.md"
  Task 2: "Execute /tdd-task-parallel T008 --progress-file specs/002/tasks.md"
  Task 3: "Execute /tdd-task-parallel T009 --progress-file specs/002/tasks.md"
  ...
Main Loop: Waits for all agents to complete
Main Loop: Runs full test suite to validate combined work
Main Loop: Stages all files, creates single commit or per-task commits
Main Loop: Updates progress file for all completed tasks
```

## Usage

```bash
# Minimal invocation
/tdd-task-parallel T007

# Custom progress file
/tdd-task-parallel T007 --progress-file specs/002-smart-email-filter/tasks.md

# Custom max attempts
/tdd-task-parallel T007 --max-attempts 5
```

## Parameters

- **task_id** (required): Task identifier to implement (e.g., T007, T015a)
- **--progress-file** (optional, default: `tasks.md`): File to READ task definition from (will NOT be modified)
- **--max-attempts** (optional, default: `10`): Maximum attempts to fix the task's own tests before stopping

## Workflow

Execute the following steps in order:

### 1. Initialization
- Reset `attempt_count = 0`
- Read the specified `progress-file` to locate task definition
- Extract task description and acceptance criteria
- Verify task exists and is not already marked complete
- Identify the test file(s) and source file(s) this task will create or modify

### 2. Scope Check
**Understand the scope:**
- Primary: Implement exactly what's described in the task
- Secondary: Fix the task's OWN tests only
- Out of scope: Adding features not in the task description
- **NEVER modify files owned by another parallel task**
- If a shared file (test factory, barrel export, types) needs changes, note it in the report — do NOT modify it

### 3. Test-First Implementation

**Create or modify test files:**
- Write comprehensive tests covering all acceptance criteria
- Include stub implementations of code being tested
- Ensure tests produce real failures (not compilation errors)
- Run ONLY THIS TASK'S tests to verify they fail for the right reasons:
```bash
npx vitest run path/to/task-test-file.test.ts
```

**Implement code:**
- Write minimal code to make new tests pass
- Follow project conventions (import paths, type safety, etc.)
- Run this task's tests to verify they're green:
```bash
npx vitest run path/to/task-test-file.test.ts
```

### 4. Task-Scoped Test Validation

**Run ONLY this task's test file(s):**
```bash
npx vitest run path/to/task-test-file.test.ts
```

**Do NOT run the full test suite.** Other parallel agents may be modifying files concurrently, making full-suite results unreliable.

**Check results:**
- If task tests pass → Proceed to step 5
- If task tests fail → Proceed to step 4.1

### 4.1 Fix Task Tests Loop

```
WHILE (task_tests_failing AND attempt_count < max_attempts):
  attempt_count++

  Analyze failures:
  - Identify which of THIS TASK'S tests broke
  - Determine root cause
  - Fix issues in files THIS TASK owns

  Rerun task tests only

  IF attempt_count >= max_attempts AND tests still failing:
    STOP and report BLOCKED status (see Failure Reporting)
```

### 5. TypeScript Validation

**Type check ONLY this task's files:**
```bash
npx tsc --noEmit
```

If this fails due to files owned by this task, fix them. If it fails due to files owned by OTHER tasks running in parallel, note it in the report but do NOT attempt to fix.

### 6. Import Path Validation

**Verify imports follow project standards:**
- ✅ Use `import type` for TypeScript interfaces/types
- ✅ Use `.js` extensions for relative imports (ESM)
- ✅ Follow existing project import conventions

### 7. Report Results (NO git commit, NO progress file update)

**⚠️ CRITICAL DIFFERENCES FROM SERIAL SKILL:**
- Do NOT stage or commit files
- Do NOT modify the progress file
- The orchestrator handles both after all parallel tasks complete

**On Success:**
Return structured summary to orchestrator:

```
✅ Task T007 Complete (parallel mode — not committed)

Implementation:
- Added: src/core/ai/confidence.ts
- Tests: tests/unit/ai/confidence.test.ts (6 new tests)

Task Test Status:
- New tests: 6 passing
- Task tests: 6/6 passing

Files Created:
- src/core/ai/confidence.ts (new)
- tests/unit/ai/confidence.test.ts (new)

Files Modified:
- (none)

Shared Files Needing Update:
- src/core/ai/index.ts (needs export for confidence module)

Awaiting orchestrator: git commit + progress file update
```

**On Failure (BLOCKED):**

```
🛑 BLOCKED: Task tests failing

Task: T007 Unit tests for toConfidenceLevel()
Status: Implementation attempted, but tests remain broken
Attempts: 10/10

Task Tests:
- 4/6 passing, 2 failing

Failing Tests:
- confidence.test.ts: "should return medium for 0.5" — expected 'medium', got 'low'
- confidence.test.ts: "should handle NaN" — throws instead of returning 'low'

Files Created (uncommitted):
- src/core/ai/confidence.ts
- tests/unit/ai/confidence.test.ts

Root Cause Analysis:
- Boundary condition at exactly 0.5 — using > instead of >=
- NaN handling not implemented

Recommendation:
- Fix boundary: change `> 0.5` to `>= 0.5`
- Add NaN guard: `if (isNaN(confidence)) return 'low'`

No rollback performed — awaiting orchestrator decision
```

## Parallel Safety Rules

### File Ownership
Each parallel task MUST only create/modify files listed in its task description. Typical ownership:

| Task Type | Owns | Does NOT Own |
|-----------|------|-------------|
| Unit test task | `tests/unit/ai/confidence.test.ts` | Other test files |
| Implementation task | `src/core/ai/confidence.ts` | Barrel exports, shared types |
| Component task | `src/tui/components/FilterInput.tsx` | `app.tsx`, other components |

### Conflict Detection
Before modifying any file, check if it's listed in another parallel task's description. If so:
1. Do NOT modify the file
2. Note the conflict in the report under "Shared Files Needing Update"
3. The orchestrator will resolve the conflict after all tasks complete

### Barrel Exports and Shared Types
- Do NOT modify `index.ts` barrel exports — report them as needed updates
- Do NOT modify shared type files unless the task explicitly says to
- The orchestrator will batch these updates after parallel tasks complete

## Best Practices Enforced

### Test-Driven Development
- ✅ Tests written before implementation
- ✅ Stubs prevent compilation errors
- ✅ See real test failures first
- ✅ Implement minimal code to pass

### Quality Gates (Task-Scoped)
- ✅ Task's own tests must pass
- ✅ TypeScript compilation checked (failures from other tasks noted, not fixed)
- ✅ Import paths validated

### Autonomous Execution
- ✅ No clarification questions
- ✅ Fix task's own broken tests automatically (up to max_attempts)
- ✅ Complete or fail (don't leave partial work in ambiguous state)
- ❌ No git commits (orchestrator responsibility)
- ❌ No progress file updates (orchestrator responsibility)

## Orchestrator Responsibilities

After all parallel tasks complete, the orchestrator MUST:

1. **Run full test suite** (`npm test`) to catch cross-task conflicts
2. **Resolve shared file updates** (barrel exports, type files) noted in task reports
3. **Fix any cross-task test failures** caused by interactions between parallel changes
4. **Stage and commit** — either one commit per task or a single batch commit
5. **Update progress file** — mark all completed tasks as `[x]`
