---
name: value-delivery-audit
description: Audit implementation tasks for broken value loops - scenarios where a user story claims to deliver functionality but lacks the components needed to see, access, verify, or complete it within that same phase.
arguments: <path-to-tasks-file>
---

# Value Delivery Audit Skill

## Purpose

Identify "Broken Value Loops" in implementation plans — scenarios where a user story claims to deliver functionality but is missing the necessary components to be fully usable, verifiable, or testable within that same phase.

This audit is the **complement to JIT auditing**:
- **JIT** prevents building too *early* (before needed)
- **Value Delivery** prevents building too *late* (after the story that needs it)

A complete value loop means: **User performs action → User sees result → We can test it**

## When to Use This Skill

Invoke this skill when:
- Reviewing any tasks.md or implementation plan before starting work
- After JIT audit to ensure nothing was deferred too aggressively
- When a story feels "incomplete" but you can't articulate why
- Before writing integration tests to confirm they're actually writable
- When reviewing task breakdowns created by other developers

## Arguments

This skill requires a path to the tasks file:
```
/value-delivery-audit specs/002-short-put-strategy/tasks.md
/value-delivery-audit path/to/any/tasks.md
```

## Execution Flow

1. **Read the tasks file** - Load the specified tasks file
2. **Map Value Loops** - For each User Story, identify the core "Action → Result → Verification" loop
3. **Apply Audit Checks** - Run the four checks from `audit-checks.md`
4. **Cross-Reference Codebase** - Actively read source files to verify components exist and support the required data/state
5. **Identify Missing Links** - Flag any part of a loop that is deferred to a later phase
6. **Generate Recommendations** - Propose specific moves using exact Task IDs

## Codebase Verification Process

**CRITICAL**: Do not assume existing components support new data. Actively verify:

1. **For UI Display Claims**: Read the component file and check if it renders the new field/state
2. **For Navigation Claims**: Read the parent component and check if the link/button exists
3. **For Service Claims**: Read the service file and check if the method handles the new case
4. **For Validation Claims**: Read the validator and check if the rule exists

Use Glob and Grep to find files, then Read to verify contents. Document what you found.

## Output Format

Produce a **Value Delivery Audit Report**:

```markdown
## Value Delivery Audit Results

### Broken Loops Found
| Story | Missing Link | Deferred To | Impact |
|-------|--------------|-------------|--------|
| [US#] | [Component/Logic] | [US#] | [Why this breaks the story/test] |

### Validated Loops
- [US#]: [Action] → [Result]
  - **Verification**: [Task ID] + [Source file:line] confirms [what]
  - **Note**: [Brief confirmation of what code handles this]

### Codebase Gaps Found
| Story | Expected In | Actual Status | Action Needed |
|-------|-------------|---------------|---------------|
| [US#] | [file path] | Missing/Incomplete | [What to add] |

### Recommendations
1. **Move [Task ID] ([Description]) from [US#] to [US#]**
   - *Reason*: Users need to see [Result] immediately after [Action].
   - *Evidence*: [What codebase check revealed this gap]

2. **Add new task to [US#]**
   - *Reason*: [Feature] requires [Missing Component] to be testable.
   - *Evidence*: Checked [file] - component does not handle [case].
```

## Verification Rules

1. **Do Not Assume**: Never say "OK if X exists." Read the file and confirm X handles the specific case.
2. **Cite Evidence**: Every "Validated Loop" must cite:
   - The specific Task ID (`T###`) that implements it
   - The source file and approximate location where you verified it
3. **Strict Numbering**: All recommendations must include specific Story (`US#`) and Task (`T###`) identifiers.
4. **Show Your Work**: For each verification, briefly note what you searched for and what you found.

## Key Principles

1. **Every story must be demo-able** - If you can't show it to a user, it's not done
2. **Every story must be testable** - If you can't write an integration test, something is missing
3. **Defer skeptically** - When in doubt, pull forward rather than push back
4. **Verify, don't assume** - Read the actual code, don't trust task descriptions

## Integration with Other Audits

Use this skill:
- AFTER JIT audit (to catch over-aggressive deferral)
- BEFORE implementation begins
- AFTER test-case-enhancer (to verify integration tests are actually writable)
