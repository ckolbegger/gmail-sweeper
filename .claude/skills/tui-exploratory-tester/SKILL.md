# TUI Exploratory Tester

**Type:** Project Managed Skill
**Purpose:** Start the app in a tmux session and perform exploratory testing around a task/story, actively trying to break things and find edge cases not covered by acceptance scenarios

**⚠️ IMPORTANT:** This skill should be invoked via the Task tool (subagent). Multiple instances can run in parallel — each gets its own tmux session.

## When to Dispatch (Team Lead Reference)

**Trigger:** Acceptance tester for the story completed with 0 bugs found.

**Sequence:**
```
Acceptance tester passes clean (0 bugs) → DISPATCH EXPLORATORY TESTER
```

**Do NOT dispatch if:**
- Acceptance testing found bugs (fix those first, re-run acceptance)
- Acceptance testing hasn't run yet
- The story is still being implemented

**After this agent completes:**
- If 0 bugs found → story is verified, move to next story or polish phase
- If bugs found → dispatch fix agents, re-commit, then re-run ACCEPTANCE tester first (not exploratory)
  - Exploratory bugs may affect acceptance scenarios, so always re-validate acceptance before re-exploring

**Prerequisites:**
- App is built (`npm run build` succeeds)
- Gmail credentials exist (`~/.config/gmail-sweep/token.json`)
- `tmux` is installed
- Acceptance tester passed clean for this story

## Usage

```bash
# Exploratory test around a user story
/tui-exploratory-tester US1 --tasks-file specs/002-smart-email-filter/tasks.md

# Exploratory test around a specific task
/tui-exploratory-tester T032 --tasks-file specs/002-smart-email-filter/tasks.md
```

## Parameters

- **target** (required): User story (e.g., US1) or task ID (e.g., T032) to explore around
- **--tasks-file** (optional, default: `tasks.md`): Path to tasks.md for context
- **--spec-file** (optional, default: auto-detected from tasks-file directory): Path to spec.md for edge cases
- **--bug-dir** (optional, default: auto-detected from tasks-file directory): Directory to write bug reports

## How This Differs from Acceptance Testing

| Aspect | Acceptance Tester | Exploratory Tester |
|--------|------------------|-------------------|
| **Test plan** | Predefined from spec scenarios | Self-directed, improvised |
| **Goal** | Verify expected behavior works | Find unexpected failures |
| **Scope** | Exactly the acceptance criteria | Anything related to the feature |
| **Input** | Happy-path and documented edge cases | Adversarial, boundary, and weird inputs |
| **Judgment** | Binary pass/fail against spec | Subjective — "this feels wrong" counts |

## Workflow

### 1. Initialization

- Read the tasks-file and spec.md for context about the target feature
- Read the **Edge Cases** section from spec.md
- Build an exploratory test charter — a rough plan of attack areas:
  - Boundary conditions (empty inputs, very long inputs, special characters)
  - Rapid interactions (fast key mashing, interrupting operations)
  - State transitions (filter while loading, clear while evaluating, navigate while filtering)
  - Error conditions (what if AI is slow? what if response is garbage?)
  - Visual/layout (terminal resize, long email subjects, unicode/emoji content)
  - Recovery (can the user always get back to a good state?)
- Generate a unique session name: `tui-explore-{target}-{timestamp}`

### 2. Start App in tmux

```bash
tmux new-session -d -s {session-name} -x 120 -y 40
tmux send-keys -t {session-name} './gmail-sweep' Enter
sleep 3
tmux capture-pane -t {session-name} -p
```

Verify the app started successfully. If not, report setup error and stop.

### 3. Explore Systematically

Work through the charter areas. For each exploration:

#### 3.1 State Your Hypothesis

Before each test, articulate what you're trying to break:
- "What happens if I press Escape when no filter is active?"
- "What happens if I type a 500-character filter description?"
- "What happens if I press `f` twice rapidly?"
- "What happens if I navigate with j/k while the filter is evaluating?"

#### 3.2 Execute the Test

Send keys to tmux and capture results. Follow the same tmux interaction pattern as the acceptance tester:

```bash
tmux send-keys -t {session-name} '{keys}'
sleep 1
tmux capture-pane -t {session-name} -p -S -100
```

#### 3.3 Evaluate the Result

Ask yourself:
- Did the app crash or hang? (capture evidence immediately)
- Is the output garbled or overlapping?
- Did the UI recover to a usable state?
- Is the behavior surprising or confusing, even if technically "correct"?
- Would a user be confused by this?

#### 3.4 Record Findings

For each exploration, record:
- What you tried (hypothesis + keys sent)
- What happened (captured output)
- Verdict: **bug**, **concern** (not broken but questionable), or **ok**

### 4. Exploration Areas (Checklist)

Work through these systematically. Not all will apply to every story.

#### Input Boundaries
- [ ] Empty filter description (just press Enter)
- [ ] Single character filter ("a")
- [ ] Very long filter description (100+ characters)
- [ ] Special characters in filter (`<script>`, `"quotes"`, `emoji 🎉`)
- [ ] Filter description with only spaces

#### Rapid Interactions
- [ ] Press `f` then immediately `Escape` (cancel before typing)
- [ ] Press `f`, type text, press `f` again (reactivate while in input mode)
- [ ] Submit filter, then immediately submit another filter
- [ ] Mash j/k rapidly during filter evaluation
- [ ] Press `q` during filter evaluation

#### State Transitions
- [ ] Navigate while filter is loading
- [ ] Clear filter while evaluation is in progress
- [ ] Activate filter on empty inbox (if possible)
- [ ] Activate filter, get results, navigate to email, then clear filter — does selection reset correctly?
- [ ] Multiple filter-clear cycles in succession

#### Visual/Layout
- [ ] Filter with 0 matches — is the empty state clear?
- [ ] Filter with 1 match — singular vs plural text?
- [ ] Filter with all matches — does anything change from unfiltered view?
- [ ] Very long email subjects in filtered view — truncation ok?
- [ ] Scroll through a long filtered list

#### Error Recovery
- [ ] Can the user always return to the full inbox with Escape?
- [ ] After an error, can the user try filtering again?
- [ ] Does the app remain responsive after any failure?

### 5. Cleanup

```bash
tmux send-keys -t {session-name} 'q'
sleep 1
tmux kill-session -t {session-name} 2>/dev/null
```

### 6. Report Results

#### No Bugs Found

```
✅ Exploratory Test: US1 — Filter Inbox by Natural Language Description

Explorations: 18
Results: 0 bugs, 2 concerns, 16 ok

Concerns (not bugs, but worth noting):
1. When filter returns 0 matches, the email preview pane still shows the last selected email — could be confusing
2. After clearing a filter, the selection jumps to the first email instead of restoring the previous position

No bug reports written.
```

#### Bugs Found

For each bug, write a file to `{bug-dir}/{target}-bug-{N}.md`. Use the same format as the acceptance tester but with exploratory-specific fields:

**Bug report file format** (`specs/002-smart-email-filter/US1-bug-2.md`):

```markdown
# Bug: [Short descriptive title]

**Found by:** tui-exploratory-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Exploratory testing — rapid interaction
**Severity:** [critical | major | minor]

## Steps to Reproduce

1. Start the app with `./gmail-sweep`
2. Press `f` to activate smart filter
3. Type "newsletters" and press Enter
4. While "Evaluating..." is displayed, press `f` again
5. Type "receipts" and press Enter

## Expected Behavior

The first evaluation should be cancelled and a new evaluation for "receipts" should begin.

## Actual Behavior

The app shows two overlapping loading indicators and eventually displays results from the first query ("newsletters") while the header shows "receipts".

## Evidence

### Terminal Capture (after second filter submitted)
```text
[paste full tmux capture-pane output]
```

### Terminal Capture (after both evaluations complete)
```text
[paste full tmux capture-pane output]
```

## Relevant Files

- `src/tui/hooks/useSmartFilter.ts` — AbortController may not be cancelling the first evaluation
- `src/core/filter/smart-filter.ts` — AbortSignal handling in batch loop

## Analysis

The useSmartFilter hook likely needs to abort the in-progress evaluation before starting a new one. The AbortController from the first call may not be properly wired to cancel the batch loop.
```

**Summary returned to orchestrator:**

```
⚠️ Exploratory Test: US1 — Filter Inbox by Natural Language Description

Explorations: 18
Results: 2 bugs, 1 concern, 15 ok

Bugs Found:
1. specs/002-smart-email-filter/US1-bug-2.md — Double filter activation causes overlapping evaluations (major)
2. specs/002-smart-email-filter/US1-bug-3.md — App hangs when submitting empty filter with spaces only (critical)

Concerns:
1. Selection position not preserved after filter clear (minor UX issue)

Bug Reports:
- specs/002-smart-email-filter/US1-bug-2.md
- specs/002-smart-email-filter/US1-bug-3.md
```

## Bug Numbering

Bug files are numbered sequentially within the bug directory. Before writing a new bug:

```bash
ls {bug-dir}/{target}-bug-*.md 2>/dev/null | wc -l
```

Use the next available number. This avoids conflicts with parallel acceptance testers writing bug files for the same target.

## tmux Reference

Same as the acceptance tester — see `.claude/skills/tui-acceptance-tester/SKILL.md` for the full tmux command reference.

### Additional Tips for Exploratory Testing

- **Capture often**: Take snapshots before AND after every interaction — you may notice issues in the "before" state too
- **Try things twice**: If something seems glitchy, repeat it. Intermittent bugs are real bugs.
- **Watch for slow rendering**: If the UI flickers or shows partial state, capture it — timing bugs matter
- **Don't just look at text**: Check alignment, spacing, and whether the cursor is in the right place
- **Trust your instincts**: If something looks "off" even if it technically works, report it as a concern

## Parallel Safety

- Each agent creates a uniquely named tmux session (`tui-explore-{target}-{timestamp}`)
- Agents do NOT share tmux sessions
- Agents do NOT modify any source files
- Bug files use sequential numbering with conflict check
- Multiple exploratory testers can run on the same story without interference
