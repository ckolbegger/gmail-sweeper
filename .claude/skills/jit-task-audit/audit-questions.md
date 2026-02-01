# JIT Audit Questions

For EVERY item in the plan, apply these four audit questions:

## 1. Dependency Audit

**Question**: Does this code depend on data/variables created in a LATER user story?

Check for:
- Calculations that use values not yet defined
- Services that reference entities not yet created
- Type extensions for types introduced in future phases

**Pattern**: "If X is in Story 5, but Y uses X and Y is in Story 3..."

**Red Flag**: Y should be deferred to Story 5

## 2. Usage Audit

**Question**: Is this code actually CALLED by any user story BEFORE the current phase?

Check for:
- Utilities with no callers in current story
- Services with no methods invoked yet
- Calculations with no inputs available yet

**Pattern**: "This calculator exists but prices aren't entered until Phase 6"

**Red Flag**: Defer calculator to Phase 6

## 3. Speculation Audit

**Question**: Is this code being built "just in case" a future story needs it?

Check for:
- "We might need this later" reasoning
- "Future stories will require this"
- Anticipatory frameworks or utilities

**Pattern**: "Let's build the full validator framework now"

**Red Flag**: Build minimal inline validators, extend later

## 4. Data Flow Audit

**Question**: Does this code produce output that no current user story CONSUMES?

Check for:
- Calculated values not displayed anywhere
- Derived state not used in UI
- Transformations with no downstream consumer

**Pattern**: "This calculates risk-reward but no story displays it"

**Red Flag**: Defer until a story needs to display it

## Audit Process

### Step 1: Map Data Dependencies

For each calculation, utility, or service:
1. List all inputs/variables it uses
2. Note which story introduces each input
3. If any input comes from a LATER story → flag for deferral

### Step 2: Map Callers/Consumers

For each utility, service, or calculation:
1. List all code that calls/uses it
2. Note which story each caller belongs to
3. If no callers in current or earlier stories → flag for deferral

### Step 3: Identify Speculative Code

Look for:
- "Foundation" or "Setup" phases before user stories
- Utilities described as "we'll need this later"
- Full frameworks when only partial functionality is needed

### Step 4: Generate Recommendations

For each flagged item, document:

| Item | Built In | Actually Needed In | Recommendation |
|------|----------|-------------------|----------------|
| P&L Calculator | Phase 2 | Phase 6 | Defer to Phase 6 |
| OCC Utilities | Phase 2 | Phase 4 | Move to Phase 4 |
| Validator Framework | Phase 1 | Phase 1+ | Build inline, extract later |
