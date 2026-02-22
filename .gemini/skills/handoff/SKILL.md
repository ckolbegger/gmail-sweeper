# Handoff Document Generator

Generate a comprehensive handoff document for continuity across coding sessions.

## Usage

```
/handoff [output-path]
```

- `output-path`: Optional. Defaults to `handoff.md` in current directory or `specs/XXX-feature/handoff.md` if in a feature directory.

## When to Use

- Before ending a session to capture current state
- Before context gets too long and needs reset
- When switching between major phases (spec → plan → implementation)
- When handing off to another developer or AI assistant

## Execution Steps

1. **Determine output path**:
   - Use provided path if given
   - If in `specs/XXX-feature/` directory, use `handoff.md` in that directory
   - Otherwise use `handoff.md` in current directory

2. **Gather context**:
   - Get current git branch: `git branch --show-current`
   - Check branch push status: `git status` and `git log origin/BRANCH..HEAD`
   - Look for spec files: `specs/*/spec.md`, `specs/*/plan.md`, `specs/*/research.md`
   - Check for any tags: `git tag --points-at HEAD`
   - List modified/staged files: `git status --short`

3. **Extract information from conversation history**:
   - Feature/project name
   - Goal/purpose of the work
   - Phases completed (Spec, Plan, Research, Implementation, etc.)
   - Approaches that worked well
   - Approaches that failed or were rejected
   - Key technology/architecture decisions made
   - Open questions or blockers
   - Next steps discussed

4. **Generate handoff document** using the template below

5. **Write file** and confirm to user

## Output Template

```markdown
# Handoff Summary: [Feature Name]

**Date**: [YYYY-MM-DD]
**Branch**: `[branch-name]`

---

## Goal

[2-3 sentence description of what the project is trying to accomplish. Include key user-facing features.]

---

## Current Progress

| Phase | Status | Artifacts |
|-------|--------|-----------|
| **Spec** | [Complete/In Progress/Not Started] | `specs/XXX-feature/spec.md` |
| **Plan** | [Complete/In Progress/Not Started] | `specs/XXX-feature/plan.md` |
| **Research** | [Complete/In Progress/Not Started] | `specs/XXX-feature/research.md` |
| **Implementation** | [Complete/In Progress/Not Started] | [key files] |

[Brief description of what was accomplished in this session]

---

## What Worked

| Approach | Outcome |
|----------|---------|
| [Specific approach taken] | [Why it worked / result] |
| [Specific approach taken] | [Why it worked / result] |

## What Failed / Avoid

| Approach | Reason |
|----------|--------|
| [Approach considered/rejected] | [Why it was rejected] |
| [Approach tried that failed] | [What went wrong] |

---

## Next Steps

1. **[Task Name]** - [Specific action with exact file path]
2. **[Task Name]** - [Specific action with exact file path]
3. **[Task Name]** - [Specific action with exact file path]

---

## Branch Info

| Property | Value |
|----------|-------|
| **Branch** | `[branch-name]` |
| **Status** | [pushed to origin / local only] |
| **Tag** | `[tag-name or N/A]` |
| **Uncommitted Changes** | [list any or "None"] |

**Key Files**:
- `[file path]` - [brief description]
- `[file path]` - [brief description]

---

## Key Decisions

| Area | Decision |
|------|----------|
| **[Category]** | [Choice made] |
| **[Category]** | [Choice made] |

---

## Open Questions

- [Question that needs resolution before proceeding]
- [Question that needs resolution before proceeding]

[Or: "None blocking. Ready to proceed with [next phase]."]
```

## Formatting Rules

- Use tables for: Current Progress, What Worked, What Failed, Branch Info, Key Decisions
- Be specific with file paths in Next Steps (e.g., "Create `specs/001-feature/data-model.md`")
- Mark blocking issues clearly in Open Questions with "**BLOCKING:**" prefix
- If no open questions, explicitly state "None blocking"
- Include relative file paths from repo root
- Keep Goal section concise (2-3 sentences max)
