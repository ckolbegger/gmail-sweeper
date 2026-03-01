---
name: test-case-enhancer
description: Enhance task breakdowns with comprehensive test coverage. Adds unit test descriptions to tasks, identifies tasks needing integration tests, and ensures story-level integration coverage for critical user flows.
---

# Test Case Enhancer Skill

## Purpose

Ensure every implementation task and user story has comprehensive test coverage by:
1. Adding "it should..." unit test descriptions to each task
2. Identifying tasks that coordinate multiple components and adding integration test tasks for them
3. Ensuring each story has end-to-end integration test coverage for critical user flows

## When to Use This Skill

Invoke this skill when:
- After generating a tasks.md or implementation plan
- Before starting implementation
- When reviewing task breakdowns for test completeness
- After `/speckit.tasks` generates initial tasks

## Execution Flow

### Phase 1: Unit Test Enhancement

1. **Read the tasks** - Load the tasks.md or implementation task file
2. **Identify testable units** - Find tasks that create components, functions, services, validators, calculators
3. **Review existing coverage** - Check what test cases are already specified
4. **Apply test categories** from `test-categories.md` to identify gaps
5. **Edit the file** - Add "it should..." unit test descriptions to each task

### Phase 2: Task-Level Integration Tests

6. **Identify coordination points** - Find tasks that:
   - Coordinate multiple services (e.g., `AssignmentService` calling `PositionService` and `TradeService`)
   - Wire components together (e.g., `Wire CreatePosition page to support Short Put strategy`)
   - Extend existing flows with new behavior
7. **Add integration test tasks** - For each coordination point, add a new task with integration test descriptions

### Phase 3: Story-Level Integration Coverage

8. **Review each story's integration tests** - Check existing integration test tasks
9. **Identify coverage gaps** - Look for missing coverage of:
   - **Critical user flows**: Complete happy path from start to finish
   - **Cross-component interactions**: Data flowing between UI → Service → Storage → UI
   - **Error scenarios**: What happens when validation fails mid-flow
10. **Add missing integration test tasks** - Create new tasks to fill gaps
11. **Generate summary** - Report what was changed

**IMPORTANT**: This skill modifies the tasks file. Use the Edit tool to update tasks and add new integration test tasks.

## Output Formats

### Unit Test Format (indented under task)

```markdown
- [ ] T009 [P] [US1] Create StrategySelector component with comprehensive unit tests in src/components/position/StrategySelector.tsx
  - Tests:
    - it should render options
    - it should change value on selection
    - it should default to Long Stock
    - it should be keyboard accessible
```

### Task-Level Integration Test Format (new task)

When a task coordinates multiple components, add an integration test task:

```markdown
- [ ] T014 [US1] Extend PositionService.create() to handle option plans with comprehensive unit tests in src/services/PositionService.ts
  - Tests:
    - it should create Short Put position
    - it should validate option fields
    - it should reject invalid strike/expiration

- [ ] T015 [US1] Integration test for PositionService option plan creation in tests/integration/position-service-options.test.ts
  - Tests:
    - it should validate via PositionValidator
    - it should persist to IndexedDB
    - it should return complete position object
```

### Story-Level Integration Test Format (end of story section)

```markdown
### Integration Tests for User Story 1

> **Write after implementation is complete** to verify the full user flow

- [ ] T016 [US1] Integration test for Short Put plan creation flow in tests/integration/short-put-plan.test.ts
  - Tests:
    - it should complete UI flow from strategy selection to plan saved
    - it should display validation errors inline
    - it should make plan retrievable after save
```

## Integration Test Criteria

### When to Add Task-Level Integration Tests

Add an integration test task when a task:
- **Coordinates multiple services**: `AssignmentService` calling `TradeService` + `PositionService`
- **Orchestrates a workflow**: `recordExpiration()` that validates, creates trade, updates position
- **Wires UI to services**: Page components that connect forms to services
- **Handles transactions**: Atomic operations that must succeed or rollback together

### Story-Level Coverage Checklist

Every story should have integration tests covering:

| Category | What to Test | Example |
|----------|--------------|---------|
| **Happy Path** | Complete flow from user action to persisted result | Create plan → see in list |
| **Validation Flow** | Invalid input → error displayed → correction → success | Bad date → error → fix → saved |
| **Cross-Component** | Data flows correctly between layers | Form → Service → DB → Detail view |
| **State Transitions** | Position status changes correctly | Planned → Open → Closed |

### Default: All Stories Need Integration Tests

Every story delivers user value, which means there's a user flow to verify. If you cannot identify an integration test for a story, question whether the story delivers real value.

Even "display-only" features need integration tests to confirm the element actually displays once all pieces are wired together.

## Enhancement Report

After completing the enhancement, produce a summary:

```markdown
## Test Case Enhancement Results

### Unit Tests Added
| Task | Tests Added | Categories |
|------|-------------|------------|
| T009 | 4 | render, interaction, defaults, a11y |

### Integration Tests Added
| Task | Level | Tests |
|------|-------|-------|
| T015 | Task | service coordination with validator and storage |
| T016 | Story | complete user flow, validation, persistence |

### Coverage Summary
- X tasks reviewed
- Y unit test descriptions added
- Z integration test tasks added

### Story Coverage
| Story | Integration Tests | Coverage |
|-------|-------------------|----------|
| US1 | 2 | Happy path, validation flow |
| US2 | 1 | Happy path |
```

## Test Count Guidelines

Different task types require different levels of test coverage:

| Task Type | Test Count | Rationale |
|-----------|------------|-----------|
| UI Components (display, selectors, buttons) | 4-6 | Core behavior + accessibility, no numeric boundaries |
| Input Components (text, number, date) | 6-8 | Must include boundary conditions |
| Validators | 6-8 | Must include boundary conditions |
| Calculators/Business Logic | 6-8 | Must include boundary conditions |
| Services | 4-6 | Boundary testing delegated to validators |
| Integration tests | 3-5 | Focus on user flow, not unit-level boundaries |

**Boundary conditions are critical** for input components, validators, and calculators. These task types commonly have bugs at min/max values, off-by-one errors, and threshold transitions. Always include at least 2-3 boundary tests for these task types.

## Key Principles

1. **Unit tests are indented** - "it should..." statements listed under each task
2. **Integration tests are separate tasks** - New task entries with their own numbers
3. **Coordination points get integration tests** - Services calling services, pages wiring components
4. **Every story gets integration tests** - No exceptions without strong justification
5. **Critical flows must be covered** - Happy path + validation + cross-component
6. **Be specific** - "it should validate via PositionValidator" not "it should test validation"
7. **Include boundary tests** - For validators, calculators, and input components

## Integration with Other Skills

Use this skill:
- AFTER `/speckit.tasks` generates tasks
- AFTER `/jit-task-audit` restructures tasks
- BEFORE implementation begins
