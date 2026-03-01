# TDD Task Implementor

**Type:** Project Managed Skill
**Purpose:** Implement a single task using strict TDD workflow with automated testing, fixing, and progress tracking

**⚠️ IMPORTANT:** This skill should be invoked via the Task tool (subagent) rather than directly in the main conversation to preserve context. The main Claude Code loop should launch a subagent that executes this skill for each task.

**⚠️ SERIAL EXECUTION REQUIRED:** Tasks must be executed one at a time in sequential order. Do not run multiple tasks in parallel. Each task must complete (or fail) before starting the next task.

**Recommended Usage Pattern:**
```
User: "Implement US1"
Main Loop: Launches general-purpose subagent with prompt:
  "Execute /tdd-task for each task in US1 (T001-T014) SERIALLY"
Subagent: Invokes skill 16 times sequentially, reports summary back to main loop
Main Loop: Reports completion to user with clean context
```

**Why Serial Execution:**
- Tasks may modify shared files (test factories, assertion helpers)
- Each task creates a git commit that depends on previous commits
- Test suite validation requires clean state from previous task
- Parallel execution could cause race conditions and merge conflicts

## Description

This skill implements a task following test-driven development principles with enforcement of best practices:
- Write all tests first with stub implementations (real test failures, not compile errors)
- Implement code to make tests green
- Run full test suite and fix any broken tests
- Update progress tracking file
- Create atomic git commit with all changes

The skill works autonomously and only stops if unable to get the full test suite green after max attempts.

## Usage

```bash
# Minimal invocation (uses defaults)
/tdd-task T006

# Custom progress file
/tdd-task T006 --progress-file TODO.md

# Custom max attempts
/tdd-task T006 --max-attempts 5

# Both custom
/tdd-task T006 --progress-file specs/003-feature/plan.md --max-attempts 15
```

## Parameters

- **task_id** (required): Task identifier to implement (e.g., T006, T015a, TASK-123)
- **--progress-file** (optional, default: `tasks.md`): File to update with completion status
- **--max-attempts** (optional, default: `10`): Maximum attempts to fix broken tests before stopping

## Workflow

Execute the following steps in order:

### 1. Initialization
- Reset `attempt_count = 0`
- Read the specified `progress-file` to locate task definition
- Extract task description and acceptance criteria
- Verify task exists and is not already marked complete

### 2. Scope Check
**Understand the scope:**
- Primary: Implement exactly what's described in the task
- Secondary: Fix ANY test that breaks due to the changes (even if it seems "unrelated")
- Out of scope: Adding features not in the task description

### 3. Test-First Implementation

**Create or modify test files:**
- Write comprehensive tests covering all acceptance criteria
- Include stub implementations of code being tested
- Ensure tests produce real failures (not compilation errors)
- Run tests to verify they fail for the right reasons

**Implement code:**
- Write minimal code to make new tests pass
- Follow project conventions (import paths, type safety, etc.)
- Run new tests to verify they're green

### 4. Full Suite Validation

**Run complete test suite:**
```bash
npm test
```

**Check results:**
- If all tests pass → Proceed to step 5
- If tests fail → Proceed to step 4.1

### 4.1 Fix Broken Tests Loop

```
WHILE (broken_tests_exist AND attempt_count < max_attempts):
  attempt_count++

  Analyze failures:
  - Identify which tests broke
  - Determine root cause
  - Common issues:
    * Missing required fields in test data
    * Test factories need updating
    * Assertion helpers need modification
    * Type mismatches

  Fix the issues:
  - Update test factories if data structure changed
  - Fix assertion helpers if behavior changed
  - Add missing fields to test objects
  - Update type definitions if needed

  Rerun full test suite

  IF attempt_count >= max_attempts AND tests still failing:
    STOP and report BLOCKED status (see Failure Reporting)
```

### 5. TypeScript & Build Validation

**Type checking:**
```bash
npx tsc --noEmit
```

**Build validation:**
```bash
npm run build
```

If either fails, fix issues and rerun. Count these as attempts toward max_attempts.

### 6. Import Path Validation

**Verify imports follow project standards:**
- ✅ Use `import type` for TypeScript interfaces/types
- ✅ Use `@/` path aliases (not relative paths like `../`)
- ❌ Never `import { Interface }` for types (causes browser errors)

**Example violations to fix:**
```typescript
// ❌ Wrong
import { Position } from '../types/position'

// ✅ Correct
import type { Position } from '@/types/position'
```

### 7. Update Progress File

**Mark task complete:**
- Locate the task line in progress-file
- Change `- [ ]` to `- [x]`
- Preserve all other formatting

**Example:**
```markdown
- [ ] T006 Create StrategySelector component
```
becomes:
```markdown
- [x] T006 Create StrategySelector component
```

### 8. Git Commit

**Stage files individually (NEVER use wildcards):**
```bash
git add src/components/StrategySelector.tsx
git add src/components/__tests__/StrategySelector.test.tsx
git add src/test/data-factories.ts
git add tasks.md
```

**Show what's staged:**
```bash
git status
```

**Create commit with task ID:**
```bash
git commit -m "[T006] Create StrategySelector component

- Added StrategySelector component with dropdown for strategy types
- Comprehensive unit tests (4 tests covering selection, defaults, accessibility)
- Fixed test factory to include trade_kind field
- All tests passing (755/755)
"
```

**Commit message format:**
- First line: `[TASK_ID] Brief description`
- Blank line
- Bullet points with details:
  - What was implemented
  - Tests added
  - Tests fixed (if any)
  - Final test count

### 9. Report Results

**On Success:**
Return structured summary to main Claude Code loop:

```
✅ Task T006 Complete

Implementation:
- Added: src/components/StrategySelector.tsx
- Tests: src/components/__tests__/StrategySelector.test.tsx (4 new tests)

Test Suite Status:
- New tests: 4 passing
- Previously broken: 0
- Currently broken: 0
- Total suite: 755/755 passing

Files Modified:
- src/components/StrategySelector.tsx (new)
- src/components/__tests__/StrategySelector.test.tsx (new)
- tasks.md (marked T006 complete)

Git:
- Commit: a1b2c3d
- Message: "[T006] Create StrategySelector component"

Notes: None
```

**On Failure (BLOCKED):**

```
🛑 BLOCKED: Unable to restore test suite

Task: T006 Create StrategySelector component
Status: New code complete, but broken tests remain

New Code:
- ✅ StrategySelector.tsx implemented
- ✅ StrategySelector.test.tsx (4/4 tests passing)

Broken Tests:
- 12 tests failing after 10 fix attempts
- Primary failures in:
  * src/pages/__tests__/PositionCreate.test.tsx (8 failures)
  * tests/integration/position-plan.test.tsx (4 failures)

Root Cause Analysis:
- Tests expect 'Long Stock' to be locked/readonly
- New implementation changed it to a dropdown selector
- Tests need assertion helper update: assertStrategyTypeLocked()

Files Modified (uncommitted):
- src/components/StrategySelector.tsx
- src/components/__tests__/StrategySelector.test.tsx
- src/test/data-factories.ts (attempted fix)

Recommendation:
- Update assertStrategyTypeLocked() in src/test/assertion-helpers.ts
- Change expectation from readonly field to dropdown with options
- Then rerun /tdd-task T006 to retry

No rollback performed - awaiting user decision
```

## Best Practices Enforced

### Test-Driven Development
- ✅ Tests written before implementation
- ✅ Stubs prevent compilation errors
- ✅ See real test failures first
- ✅ Implement minimal code to pass

### Quality Gates
- ✅ Full test suite must pass
- ✅ TypeScript compilation must succeed
- ✅ Build must succeed
- ✅ Import paths validated

### Git Hygiene
- ✅ Individual file staging (no wildcards)
- ✅ Descriptive commit messages with task ID
- ✅ Atomic commits (new code + fixes + progress in one commit)
- ✅ Show staged files before committing

### Autonomous Execution
- ✅ No clarification questions
- ✅ Fix broken tests automatically (up to max_attempts)
- ✅ Update progress tracking automatically
- ✅ Complete or fail (don't leave partial work uncommitted)

## Error Handling

### Scenario: Task not found in progress-file
```
❌ Error: Task T999 not found in tasks.md

Searched for patterns:
- [ ] T999
- [x] T999
- T999

Please verify:
1. Task ID is correct
2. Progress file is correct (use --progress-file if not tasks.md)
```

### Scenario: Task already complete
```
⚠️  Warning: Task T006 already marked complete in tasks.md

Current status: [x] T006 Create StrategySelector component

Continue anyway? This will re-implement and create a new commit.
```

### Scenario: Max attempts exceeded
See "On Failure (BLOCKED)" in Report Results section above.

## Integration Test Awareness

**Task-level integration tests:**
If task ID ends with 'a' (e.g., T011a, T005a), this indicates an integration test task:
- Focus on testing service coordination and data persistence
- No implementation code, only test code
- Verify interaction between multiple components/services

**Story-level integration tests:**
Tasks explicitly labeled "Integration test for [feature]" test complete user flows.

**Sanity check (optional):**
After implementation, briefly note if integration coverage seems incomplete, but **don't block** on it:
```
Notes: Implementation adds new user flow (strategy selection → validation → save).
Consider if story-level integration test covers this path.
```

## Examples

### Example 1: Simple Component Task
```bash
/tdd-task T007
```

**Result:**
- Creates StrikePriceInput.tsx
- Creates StrikePriceInput.test.tsx with 5 tests
- All tests green
- Full suite green (no broken tests)
- Updates tasks.md
- Commits: `[T007] Create StrikePriceInput component`

### Example 2: Task That Breaks Tests
```bash
/tdd-task T011
```

**Result:**
- Extends PositionService.create() with option fields
- New tests green
- Breaks 134 existing tests (missing trade_kind field)
- Auto-fixes test factories (attempt 1)
- Fixes remaining test files (attempts 2-4)
- Full suite green after 4 attempts
- Updates tasks.md
- Commits: `[T011] Extend PositionService.create() to handle option plans`

### Example 3: Custom Configuration
```bash
/tdd-task FEATURE-42 --progress-file docs/sprint-plan.md --max-attempts 5
```

**Result:**
- Looks for task FEATURE-42 in docs/sprint-plan.md
- Allows up to 5 fix attempts
- Otherwise same workflow

## Notes

- **Context preservation:** This skill is designed to keep main conversation context clean by doing all implementation work in a subagent
- **Resumability:** If blocked, user can debug and re-invoke the same task
- **Audit trail:** Git commits provide complete history of what was done when
- **Consistency:** Same rigorous process applied to every task across all projects

## Future Enhancements

Once proven in this project, promote to user skill for use across all projects:
```
~/.claude/skills/tdd-task/SKILL.md
```
