# Separation of Concerns Design Questionnaire

Present these questions section by section. Wait for user responses before proceeding to the next section. Adapt follow-up questions based on answers.

---

## Section 1: Feature Overview

**Q1.1** What is the feature you're implementing?
> _Brief description of the functionality_

**Q1.2** What user problem does this solve?
> _Helps identify if this is UI, logic, or data-focused_

**Q1.3** Does this feature involve:
- [ ] Displaying data to users
- [ ] Accepting user input
- [ ] Performing calculations or transformations
- [ ] Validating data
- [ ] Persisting/retrieving data
- [ ] Coordinating between multiple operations

---

## Section 2: UI Layer Analysis

_Skip if feature has no UI component_

**Q2.1** What does the user SEE?
> _Visual elements, displays, feedback_

**Q2.2** What does the user DO?
> _Clicks, inputs, gestures, navigation_

**Q2.3** What DECISIONS does the UI make?
> _Be suspicious of any answer here - UI should make minimal decisions_

**Critical Check:** If Q2.3 has substantial answers, probe deeper:
- Is this decision about HOW to display something? → OK for UI
- Is this decision about WHAT to display? → Should be Business Logic
- Is this decision about WHETHER something is valid? → Should be Validator
- Is this decision about CALCULATING a value? → Should be Calculator

**Q2.4** What PROPS should this component receive?
> _Components should receive calculated values, not raw data to process_

**Design Principle Reminder:**
```
WRONG: Component receives trades[], calculates avgCost internally
RIGHT: Component receives avgCost as a prop, parent calculates it
```

---

## Section 3: Business Logic Layer Analysis

**Q3.1** What VALIDATION rules apply?
List each validation with:
- What is being validated
- What makes it valid/invalid
- When validation occurs

**Q3.2** What CALCULATIONS are needed?
List each calculation with:
- Inputs required
- Output produced
- Formula or logic description

**Q3.3** What BUSINESS RULES govern behavior?
- Constraints that aren't validation (e.g., "users can only have 5 active positions")
- State transitions (e.g., "planned → open → closed")
- Derived states (e.g., "status determined by trade quantities")

**Q3.4** Where should each piece of logic live?

| Logic | Type | Suggested Location |
|-------|------|-------------------|
| _[from Q3.1-3.3]_ | Validator/Calculator/Rule | _[file path]_ |

**Design Principle Reminder:**
```
Validators: Pure functions, static methods, no side effects
Calculators: Pure functions, static methods, deterministic
Business Rules: Can be in validators, calculators, or dedicated rule classes
```

---

## Section 4: Data Layer Analysis

_Skip if feature doesn't involve persistence_

**Q4.1** What data is being READ?
- Entity types
- Query patterns (by ID, by filter, all)
- Relationships between entities

**Q4.2** What data is being WRITTEN?
- Create/Update/Delete operations
- Transaction requirements (multiple writes that must succeed together)

**Q4.3** How should services access the database?
- [ ] Accept database connection via constructor (dependency injection)
- [ ] Use service container / context for access
- [ ] Other pattern: _____________

**Critical Check:** If answer involves creating database connections:
- Is this a new service? → Should accept IDBDatabase in constructor
- Is this modifying existing service? → Should already have injected db
- Is connection created in component/page? → ANTI-PATTERN - move to service layer

**Q4.4** What is the service method naming convention?
- `getById(id)` - Retrieve single entity
- `getAll()` - Retrieve all entities
- `create(entity)` - Create new entity
- `update(entity)` - Update existing entity
- `delete(id)` - Remove entity

---

## Section 5: Layer Dependencies

**Q5.1** How does UI access business logic?
- [ ] Imports calculators/validators directly (static methods)
- [ ] Receives calculated values as props from parent
- [ ] Calls service methods that delegate to domain layer
- [ ] Other: _____________

**Q5.2** How does UI access data services?
- [ ] Via React Context (ServiceProvider/useServices hook)
- [ ] Props passed from parent container
- [ ] Direct import (ANTI-PATTERN for most cases)

**Q5.3** How do services access each other?
- [ ] Dependency injection via constructor
- [ ] ServiceContainer provides dependencies
- [ ] Direct instantiation (ANTI-PATTERN)

**Design Principle Reminder:**
```
UI → imports Calculators (static methods OK)
UI → uses Context for Services (never instantiate directly)
Services → accept dependencies in constructor
Services → delegate to Validators/Calculators for logic
```

---

## Section 6: Existing Code Integration

**Q6.1** Does similar functionality exist in the codebase?
- If yes, what patterns does it follow?
- Should this new code follow the same pattern?
- Are there shared utilities to reuse?

**Q6.2** What existing code will be MODIFIED?
- List files that need changes
- Identify potential breaking changes

**Q6.3** What NEW files will be CREATED?
Organize by layer:

| Layer | File Path | Purpose |
|-------|-----------|---------|
| UI | `src/components/...` | _description_ |
| UI | `src/pages/...` | _description_ |
| Domain | `src/domain/validators/...` | _description_ |
| Domain | `src/domain/calculators/...` | _description_ |
| Service | `src/services/...` | _description_ |
| Config | `src/config/...` | _description_ |
| Utils | `src/utils/...` | _description_ |

---

## Section 7: Testing Strategy

**Q7.1** What should be unit tested?
- [ ] Validators (pure function tests)
- [ ] Calculators (pure function tests)
- [ ] Service methods (with mocked/fake database)

**Q7.2** What should be integration tested?
- [ ] Full user workflows (component → service → database)
- [ ] Service coordination (multiple services working together)
- [ ] Data persistence (write then read)

**Q7.3** Where will test files live?

| Source File | Test File Location |
|-------------|-------------------|
| `src/domain/validators/X.ts` | `src/domain/__tests__/X.test.ts` |
| `src/domain/calculators/X.ts` | `src/domain/__tests__/X.test.ts` |
| `src/services/X.ts` | `src/services/__tests__/X.test.ts` |
| `src/components/X.tsx` | `src/components/__tests__/X.test.tsx` |

---

## Section 8: Final Design Review

Before proceeding, verify:

- [ ] No business logic in UI components
- [ ] No data access in UI components (except via Context)
- [ ] Validators are pure functions (no side effects)
- [ ] Calculators are pure functions (deterministic)
- [ ] Services don't create their own database connections
- [ ] No magic numbers (use config constants)
- [ ] No duplicate code across layers

**Generate Layer Assignment Document** based on answers above.
