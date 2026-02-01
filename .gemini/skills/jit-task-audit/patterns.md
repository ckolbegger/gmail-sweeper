# JIT Patterns and Transformations

## Premature Implementation Patterns

| Premature Pattern | JIT Transformation |
|-------------------|-------------------|
| Calculator before inputs exist | Defer to story that provides inputs |
| Full utility before partial need | Build minimal inline version, extend later |
| Type extension before usage | Extend types in the story that uses them |
| Service before any consumer | Create service when first called |
| Validator framework before validation needs | Inline validators first, extract later |
| "Just in case" code | Remove, implement inline when actually needed |
| IndexedDB schema for future feature | Migrate schema in story that uses it |
| Generic component before specific use | Build specific component, generalize later |

## Common Red Flags in Plans

### "Foundation" or "Setup" Phases

**Anti-pattern**:
```
Phase 1 (Setup): Build P&L calculator, OCC utilities, validator framework
Phase 2: Create position
Phase 3: Add trade
```

**JIT Version**:
```
Phase 1: Create position (inline validators only)
Phase 2: Add trade (OCC utilities here)
Phase 3: Close trade (realized P&L calculator here)
```

### Shared Infrastructure Before Stories

**Anti-pattern**: "All user stories depend on this foundation phase"

**JIT Version**: Each user story introduces exactly what it needs

### Type Definitions in Isolation

**Anti-pattern**: Define all types in Phase 1, use them in Phase 3+

**JIT Version**: Extend types in the story that first uses them

## Scoring Guidelines

### Correctly Placed (Count as JIT-compliant)

- Item is built in the same phase it's first used
- Type is extended in the story that needs the extension
- Service is created when first invoked
- Calculator is built when its inputs become available

### Prematurely Placed (Count as violations)

- Item is built N phases before first use (N >= 1)
- "Foundation" items with no immediate consumer
- Type extensions for future features
- Calculations depending on data not yet available

## Example Transformations

### Before JIT Audit

```
Phase 1: Setup
- T001 Create CostBasisCalculator with FIFO
- T002 Create OCC symbol utilities
- T003 Create OptionContractValidator

Phase 2: US1 - Create Position Plan
- T004 Create PositionForm
```

### After JIT Audit

```
Phase 1: US1 - Create Position Plan
- T001 Create PositionForm (inline validation)

Phase 2: US2 - Execute STO Trade
- T002 Create OCC symbol utilities (first OCC usage)
- T003 Create OptionContractValidator (first trade validation)

Phase 3: US3 - Close via BTC
- T004 Create CostBasisCalculator with FIFO (first P&L calculation)
```

### Key Questions for Each Item

1. "What user story needs this RIGHT NOW?"
2. "When is this first called/consumed?"
3. "What inputs does this depend on, and when are they available?"
4. "Is there a current UI that displays this output?"
