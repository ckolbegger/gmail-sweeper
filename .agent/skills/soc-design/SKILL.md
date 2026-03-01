---
name: soc-design
description: Separation of Concerns Design Questionnaire. Use this skill when starting new feature implementation, designing components, planning architecture, or adding significant functionality. Guides proper layering of UI, business logic, and data access to prevent tight coupling and ensure maintainable code.
---

# Separation of Concerns Design Skill

## Purpose

This skill prevents separation of concerns violations by guiding feature design BEFORE implementation begins. It ensures proper layering across:

- **UI Layer** - Presentation and user interaction only
- **Business Logic Layer** - Validation, calculations, and domain rules
- **Data Layer** - Persistence and data access

## When to Use This Skill

Invoke this skill automatically when you detect:
- User starting a new feature implementation
- User designing a new component or page
- User planning to add significant functionality
- User asking "how should I structure..." or "where should I put..."
- User beginning work from a spec or requirements document

## Execution Flow

1. **Read the questionnaire** from `questionnaire.md` in this skill directory
2. **Present questions** section by section, gathering answers
3. **Check for anti-patterns** using `anti-patterns.md`
4. **Generate a design summary** documenting:
   - Which layer each piece of functionality belongs to
   - File locations for new code
   - Dependencies between layers
   - Potential anti-patterns to avoid
5. **Get user approval** before implementation begins

## Output Format

After completing the questionnaire, produce a **Layer Assignment Document**:

```markdown
# Feature Design: [Feature Name]

## Layer Assignments

### UI Layer (Presentation)
- Components: [list with file paths]
- Props received: [calculated values, not raw data]
- User interactions: [events handled]

### Business Logic Layer (Domain)
- Validators: [validation rules and file paths]
- Calculators: [computation logic and file paths]
- Business rules: [domain constraints]

### Data Layer (Persistence)
- Services: [CRUD operations and file paths]
- Entities: [data structures]
- Queries: [data access patterns]

## Anti-Pattern Watchlist
- [Specific patterns to avoid for this feature]

## Dependencies
- UI → Business Logic: [how UI accesses calculations]
- Business Logic → Data: [how logic accesses persistence]
- Dependency Injection: [how services are provided]
```

## Integration with Existing Workflows

This skill complements but does not replace:
- `/speckit.specify` - Requirements specification (WHAT)
- `/speckit.plan` - Implementation planning (HOW)
- `/soc-review` - Pre-commit code review (VERIFY)

Use this skill AFTER requirements are clear but BEFORE coding begins.
