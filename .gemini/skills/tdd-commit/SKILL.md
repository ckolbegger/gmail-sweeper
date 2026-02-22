---
name: tdd-commit
description: Validate the full test suite and commit a completed task's files. Single instance per team — serializes all commits.
---

# TDD Commit Agent

**Type:** Project Managed Skill
**Purpose:** Validate the full test suite and commit a completed task's files. Single instance per team — serializes all commits.

**⚠️ SINGLE INSTANCE:** Only one commit agent should exist per team. All commit requests are sent to this agent via message, ensuring commits are serialized and the test suite is validated before each one.

**⚠️ NO COMMITS ON FAILURE:** If the test suite fails, the commit agent does NOT commit. It reports the failures back to the orchestrator, who decides how to proceed (fix agent, manual fix, or skip).

## Usage

The orchestrator sends a message to the commit agent with:

```
Commit task T007:
- Task description: "Unit tests for toConfidenceLevel() mapping"
- Files: tests/unit/ai/confidence.test.ts, src/core/ai/provider.ts
- Progress file: specs/002-smart-email-filter/tasks.md
```

Or for shared file resolution + commit:

```
Commit task T007:
- Task description: "Unit tests for toConfidenceLevel() mapping"
- Files: tests/unit/ai/confidence.test.ts, src/core/ai/provider.ts
- Shared file updates: src/core/ai/index.ts (add export for confidence module)
- Progress file: specs/002-smart-email-filter/tasks.md
```

## Parameters (from orchestrator message)

- **task_id** (required): Task identifier (e.g., T007)
- **task_description** (required): Brief description for the commit message
- **files** (required): List of files the task created or modified
- **shared_file_updates** (optional): Shared files that need updating (barrel exports, types) — the commit agent makes these edits
- **progress_file** (required): Path to tasks.md to mark task complete

## Workflow

### 1. Verify Files Exist

For each file in the file list, verify it exists and has unstaged changes:

```bash
git status --porcelain -- {file}
```

If a listed file has no changes (already committed or doesn't exist), report it and continue with the remaining files. If NO files have changes, report back to orchestrator — nothing to commit.

### 2. Apply Shared File Updates (if any)

If the orchestrator specified shared file updates (e.g., "add export to index.ts"):

- Read the shared file
- Make the specified edit (add export line, update type, etc.)
- These changes will be included in the commit

### 3. Run Full Test Suite

```bash
npm test 2>&1
```

**Capture the full output.** Parse for:
- Total tests run
- Tests passed
- Tests failed
- Failure details (file, test name, error message)

### 4. Evaluate Results

#### All Tests Pass → Proceed to Commit

Continue to step 5.

#### Tests Fail → Report and STOP

Do NOT commit. Send failure report back to orchestrator:

```
❌ Commit REJECTED for T007 — test suite failed

Test Results:
- Total: 107
- Passed: 104
- Failed: 3

Failures:
1. tests/unit/ai/confidence.test.ts > toConfidenceLevel > should return medium for 0.5
   Expected: "medium"
   Received: "low"

2. tests/unit/filter/smart-filter.test.ts > runSmartFilter > should split into batches
   TypeError: calculateBatchSize is not a function

3. tests/unit/tui/EmailList.test.tsx > EmailList > should render email subject
   Error: Cannot find module '../../../src/core/ai/provider.js'

Files NOT committed:
- tests/unit/ai/confidence.test.ts
- src/core/ai/provider.ts

Recommendation:
- Failure 1: Boundary condition bug in toConfidenceLevel — using > instead of >=
- Failure 2: calculateBatchSize not exported from batch-sizing module
- Failure 3: Import path issue — EmailList may have a stale import
```

The orchestrator can then dispatch a fix agent or send the details back to the original task agent.

### 5. Stage Files

Stage each file individually. **Never use wildcards or `git add .`:**

```bash
git add tests/unit/ai/confidence.test.ts
git add src/core/ai/provider.ts
git add src/core/ai/index.ts
git add specs/002-smart-email-filter/tasks.md
```

### 6. Update Progress File

Before staging the progress file, mark the task complete:

- Read the progress file
- Change `- [ ] {task_id}` to `- [x] {task_id}`
- Stage the progress file

### 7. Verify Staged Files

```bash
git diff --cached --stat
```

Confirm that ONLY the expected files are staged. If unexpected files appear, unstage them:

```bash
git restore --staged {unexpected-file}
```

### 8. Commit

```bash
git commit -m "$(cat <<'EOF'
[T007] Unit tests for toConfidenceLevel() mapping

- Added confidence threshold tests (high ≥0.8, medium ≥0.5, low <0.5)
- Implemented toConfidenceLevel() in src/core/ai/provider.ts
- All tests passing (107/107)

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
```

**Commit message format:**
- First line: `[TASK_ID] Brief description`
- Blank line
- Bullet points:
  - What was implemented/tested
  - What was fixed (if shared files updated)
  - Final test count
- Blank line
- Co-authored-by line

### 9. Post-Commit Verification

```bash
git status
```

Confirm working tree is clean for the committed files. Report any remaining unstaged changes (these belong to other tasks).

### 10. Report Success

Send back to orchestrator:

```
✅ Committed T007: Unit tests for toConfidenceLevel() mapping

Commit: a1b2c3d
Files:
- tests/unit/ai/confidence.test.ts (new)
- src/core/ai/provider.ts (new)
- src/core/ai/index.ts (updated — added export)
- specs/002-smart-email-filter/tasks.md (marked T007 complete)

Test Suite: 107/107 passing

Remaining unstaged changes: 4 files (belong to other tasks)
```

## Handling Multiple Tasks in Sequence

The orchestrator may queue multiple commit requests. Process them one at a time:

```
Orchestrator → "Commit T007: ..."
Commit Agent → runs suite, commits, reports success
Orchestrator → "Commit T008: ..."
Commit Agent → runs suite, commits, reports success
Orchestrator → "Commit T009: ..."
Commit Agent → runs suite, FAILS, reports failures
Orchestrator → dispatches fix agent for T009
```

Each commit includes the full test suite run, so regressions introduced by one task are caught before the next commit.

## Edge Cases

### Task files overlap with previously committed task
If `git status` shows a file is already committed (no changes), it was likely committed as part of an earlier task. Skip it and note in the report.

### Shared file conflict
If the shared file update conflicts with another task's changes (already modified), report back to orchestrator rather than attempting a merge.

### Empty commit
If all files are already committed and the progress file is already marked complete, report "nothing to commit" rather than creating an empty commit.

### Test suite hangs
Set a timeout on the test command:
```bash
timeout 120 npm test 2>&1
```
If it times out, report back as a failure with "test suite timed out after 120s".

## Team Integration

In a team setup:
- **Name**: `commit-agent`
- **Type**: `general-purpose` (needs Bash for git/npm, Edit for progress file, Read for verification)
- **Receives work from**: Orchestrator only (via SendMessage)
- **Reports to**: Orchestrator only (via SendMessage)
- **Never receives from**: Task agents, tester agents (they report to orchestrator, who queues commits)

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│ Task Agent 1 │────▶│              │     │              │
├─────────────┤     │              │────▶│ Commit Agent  │
│ Task Agent 2 │────▶│ Orchestrator │     │ (singleton)  │
├─────────────┤     │              │◀────│              │
│ Task Agent 3 │────▶│              │     │              │
└─────────────┘     └──────────────┘     └──────────────┘
```

The orchestrator batches completed task reports and feeds them to the commit agent one at a time.
