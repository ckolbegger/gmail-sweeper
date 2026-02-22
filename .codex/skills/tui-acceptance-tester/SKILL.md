---
name: tui-acceptance-tester
description: Run task/story acceptance scenarios in a tmux session, verify expected behavior, and report reproducible bugs with evidence.
arguments: <target> [--tasks-file <path>] [--spec-file <path>] [--bug-dir <dir>]
---

# TUI Acceptance Tester

**Type:** Project Managed Skill
**Purpose:** Start the app in a tmux session and verify acceptance scenarios from the task/story spec, reporting any bugs found

**⚠️ IMPORTANT:** This skill should be invoked via the Task tool (subagent). Multiple instances can run in parallel — each gets its own tmux session.

## When to Dispatch (Team Lead Reference)

**Trigger:** ALL tasks in a user story phase have been committed and the test suite is green.

**Sequence:**
```
Story tasks complete → commit agent confirms all green → DISPATCH ACCEPTANCE TESTER
```

**Do NOT dispatch if:**
- Any task in the story is still in progress or blocked
- The commit agent reported test failures that haven't been fixed
- The story depends on another story that hasn't passed acceptance yet

**After this agent completes:**
- If 0 bugs found → dispatch exploratory tester for the same story
- If bugs found → dispatch fix agents, re-commit, then re-run acceptance tester

**Prerequisites:**
- App is built (`npm run build` succeeds)
- Gmail credentials exist (`~/.config/gmail-sweep/token.json`)
- `tmux` is installed
- ALL story tasks committed and test suite green

## Usage

```bash
# Test a specific user story's acceptance scenarios
/tui-acceptance-tester US1 --tasks-file specs/002-smart-email-filter/tasks.md

# Test a specific task
/tui-acceptance-tester T032 --tasks-file specs/002-smart-email-filter/tasks.md
```

## Parameters

- **target** (required): User story (e.g., US1, US2) or task ID (e.g., T032) to test
- **--tasks-file** (optional, default: `tasks.md`): Path to tasks.md for reading task/story definitions
- **--spec-file** (optional, default: auto-detected from tasks-file directory): Path to spec.md for acceptance scenarios
- **--bug-dir** (optional, default: auto-detected from tasks-file directory): Directory to write bug reports

## Workflow

### 1. Initialization

- Read the tasks-file to locate the target task or story
- Read spec.md to extract acceptance scenarios for the target story
- If target is a task ID, determine which user story it belongs to (from the [USx] label)
- Build the test plan: an ordered list of acceptance scenarios to verify
- Generate a unique session name: `tui-test-{target}-{timestamp}`

### 2. Start App in tmux

**Create a detached tmux session and launch the app:**
```bash
tmux new-session -d -s {session-name} -x 120 -y 40
tmux send-keys -t {session-name} './gmail-sweep' Enter
```

**Wait for the app to be ready:**
```bash
# Poll until the app renders (look for the inbox header)
sleep 3
tmux capture-pane -t {session-name} -p
```

Verify the app started successfully by checking for expected UI elements (e.g., "Gmail Inbox", email list). If the app fails to start within 15 seconds, report as a setup error and stop.

### 3. Capture Baseline State

**Take an initial snapshot:**
```bash
tmux capture-pane -t {session-name} -p -S -100
```

Record:
- Number of emails visible
- Current selected email
- UI elements present (header, footer, help text)
- Any error messages

### 4. Execute Acceptance Scenarios

For each acceptance scenario from the spec:

#### 4.1 Plan the Interaction Sequence

Map the scenario's **Given/When/Then** to tmux commands:

| Scenario Action | tmux Command |
|----------------|--------------|
| Navigate to email | `tmux send-keys -t {session} 'j'` (repeat as needed) |
| Activate smart filter | `tmux send-keys -t {session} 'f'` |
| Type filter text | `tmux send-keys -t {session} 'newsletters about investing'` |
| Submit filter | `tmux send-keys -t {session} Enter` |
| Clear filter | `tmux send-keys -t {session} Escape` |
| Scroll preview | `tmux send-keys -t {session} ']'` |
| Refresh | `tmux send-keys -t {session} C-r` |
| Wait for loading | `sleep 2` then capture and check |

#### 4.2 Execute and Verify

For each step in the scenario:

1. **Send the interaction:**
   ```bash
   tmux send-keys -t {session-name} '{key}'
   ```

2. **Wait for UI to update:**
   ```bash
   sleep 1
   ```
   For operations that involve network/AI calls, wait longer (up to 15 seconds) and poll:
   ```bash
   # Poll until loading indicator disappears or timeout
   for i in $(seq 1 15); do
     OUTPUT=$(tmux capture-pane -t {session-name} -p)
     if echo "$OUTPUT" | grep -q "expected text"; then break; fi
     sleep 1
   done
   ```

3. **Capture the result:**
   ```bash
   tmux capture-pane -t {session-name} -p -S -100
   ```

4. **Verify the Then condition:**
   - Check for expected text/UI elements in the captured output
   - Check that unexpected elements are NOT present
   - Record PASS or FAIL with evidence

#### 4.3 Record Result

For each scenario, record:
- Scenario description (Given/When/Then)
- Steps executed
- Expected outcome
- Actual outcome (captured pane text)
- PASS / FAIL
- If FAIL: what was wrong and the full captured output

### 5. Cleanup

**Kill the tmux session:**
```bash
tmux send-keys -t {session-name} 'q'
sleep 1
tmux kill-session -t {session-name} 2>/dev/null
```

### 6. Report Results

#### All Scenarios Passed

```
✅ Acceptance Test: US1 — Filter Inbox by Natural Language Description

Scenarios Tested: 4/4
Results: 4 PASS, 0 FAIL

1. ✅ Given inbox displayed, When user activates filter and types "receipts from online purchases", Then only receipt emails shown
2. ✅ Given inbox displayed, When user enters filter description, Then loading indicator shown
3. ✅ Given AI has evaluated emails, When results ready, Then email list shows only matches with count
4. ✅ Given filter entered, When no emails match, Then "no matches found" message displayed

No bugs found.
```

#### Bugs Found

For each bug, write a file to `{bug-dir}/{target}-bug-{N}.md` and report the filename.

**Bug report file format** (`specs/002-smart-email-filter/US1-bug-1.md`):

```markdown
# Bug: [Short descriptive title]

**Found by:** tui-acceptance-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Scenario:** #3 — Given AI has evaluated emails, When results ready, Then email list shows only matches with count
**Severity:** [critical | major | minor]

## Steps to Reproduce

1. Start the app with `./gmail-sweep`
2. Press `f` to activate smart filter
3. Type "newsletters about investing" and press Enter
4. Wait for evaluation to complete

## Expected Behavior

Email list updates to show only matching emails with "Filtered: X/Y emails" count displayed.

## Actual Behavior

Filtered emails are shown but no count is displayed. The header still shows "Gmail Inbox (50 emails)" instead of "Filtered: 3/50 emails".

## Evidence

### Terminal Capture (after filter applied)
```text
[paste full tmux capture-pane output here]
```

## Relevant Files

- `src/tui/app.tsx` — header rendering
- `src/tui/components/EmailList.tsx` — filter count display
- Acceptance scenario: spec.md line XX

## Suggested Fix

The `EmailList` component may not be receiving or rendering the `filterCount`/`totalCount` props when a filter is active.
```

**Summary returned to orchestrator:**

```
⚠️ Acceptance Test: US1 — Filter Inbox by Natural Language Description

Scenarios Tested: 4/4
Results: 3 PASS, 1 FAIL

1. ✅ PASS: Filter shows only matching emails
2. ✅ PASS: Loading indicator displayed during evaluation
3. ❌ FAIL: Match count not displayed — see specs/002-smart-email-filter/US1-bug-1.md
4. ✅ PASS: "No matches found" message shown for zero results

Bug Reports:
- specs/002-smart-email-filter/US1-bug-1.md
```

## tmux Reference

### Common Commands

```bash
# Create session with specific size
tmux new-session -d -s {name} -x 120 -y 40

# Send a single key
tmux send-keys -t {name} 'j'

# Send a key with modifier
tmux send-keys -t {name} C-r        # Ctrl+R
tmux send-keys -t {name} Escape     # Escape key

# Send text (types it character by character)
tmux send-keys -t {name} 'search query'

# Send Enter
tmux send-keys -t {name} Enter

# Capture visible pane content
tmux capture-pane -t {name} -p

# Capture with scrollback history (last 100 lines)
tmux capture-pane -t {name} -p -S -100

# Kill session
tmux kill-session -t {name}

# List sessions (for debugging)
tmux list-sessions
```

### Tips

- Always `sleep 1` after sending keys before capturing — UI needs time to re-render
- For AI/network operations, poll with `sleep 1` in a loop up to 15 seconds
- Use `-x 120 -y 40` for consistent terminal size across test runs
- Capture pane BEFORE and AFTER each action for evidence
- If the app crashes, capture the pane output as crash evidence before killing the session

## Parallel Safety

- Each agent creates a uniquely named tmux session (`tui-test-{target}-{timestamp}`)
- Agents do NOT share tmux sessions
- Agents do NOT modify any source files
- Bug reports use unique filenames (`{target}-bug-{N}.md`)
- If two agents test the same story, they write separate bug files (no conflicts)
