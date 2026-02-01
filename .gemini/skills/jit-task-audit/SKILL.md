---
name: jit-task-audit
description: Audit implementation tasks for premature implementation using Just-In-Time principles. Identifies code being built before it's actually needed and recommends deferring to the story that first requires it.
---

# Just-In-Time Task Audit Skill

## Purpose

Apply Just-In-Time (JIT) auditing to implementation tasks to identify code being built before it's actually needed. JIT implementation means:

- Only build what the current user story needs
- Defer utilities, calculations, and types until they're immediately required
- Avoid "just in case" code or anticipatory implementations

## When to Use This Skill

Invoke this skill when:
- Reviewing any tasks.md or implementation plan
- Starting a new feature implementation
- Planning dependencies and utilities
- Before creating a "foundational" or "setup" phase
- When you see utilities that might be "nice to have later"

## Execution Flow

1. **Read the tasks** - Load the tasks.md or implementation task file
2. **Apply audit questions** from `audit-questions.md`
3. **Map dependencies** - Track which story introduces each piece of infrastructure
4. **Identify premature items** using `patterns.md`
5. **Generate recommendations** with specific move/defer actions
6. **Calculate JIT score** - percentage of items correctly placed

## Output Format

After completing the audit, produce a **JIT Audit Report**:

```markdown
## JIT Audit Results

### Items Correctly Placed
| Item | Built In | Used In | Status |
|------|----------|---------|--------|
| [name] | [phase] | [phase] | OK |

### Premature Implementations Found
| Item | Built In | Needed In | Recommendation |
|------|----------|-----------|----------------|
| [name] | [phase] | [phase] | [action] |

### Just-In-Time Score
X/Y items follow JIT principle (Z%)

### Recommendations
1. Move [item] from [early phase] to [correct phase]
2. Remove [item] entirely, implement inline when needed
3. Keep [item] - it's needed by [current story]
4. Convert [item] to minimal inline version in [story]
```

## Key Principles

1. **Build only what the current user story needs**
2. **Defer everything else** - you know more after completing each story
3. **Inline first, extract later** - don't build frameworks upfront
4. **Types evolve with implementation** - extend when actually used
5. **No "just in case" code** - if you can't name the caller now, defer it

## Integration with Existing Workflows

Use this skill:
- AFTER `/speckit.tasks` generates the initial task breakdown
- BEFORE implementation begins
- When reviewing task breakdowns created by other developers
