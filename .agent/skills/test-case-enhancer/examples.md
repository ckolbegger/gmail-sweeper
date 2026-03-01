# Test Case Examples

Real examples of well-written "it should..." test case descriptions.

---

## UI Component Examples

### Selector Component
```markdown
- [ ] T009 [P] [US1] Create StrategySelector component with comprehensive unit tests in src/components/position/StrategySelector.tsx
  - Tests:
    - it should render options
    - it should change value on selection
    - it should default to Long Stock
    - it should be keyboard accessible
```

### Input Component (with boundary conditions)
```markdown
- [ ] T010 [P] [US1] Create StrikePriceInput component with comprehensive unit tests in src/components/option/StrikePriceInput.tsx
  - Tests:
    - it should accept valid input (happy path)
    - it should reject negative values
    - it should reject non-numeric input
    - it should accept decimals
    - it should accept value at exact minimum (0.01)
    - it should reject value just below minimum (0.00)
    - it should accept value at maximum allowed
```

### Date Picker (with boundary conditions)
```markdown
- [ ] T011 [P] [US1] Create ExpirationDatePicker component with comprehensive unit tests in src/components/option/ExpirationDatePicker.tsx
  - Tests:
    - it should accept valid future date (happy path)
    - it should reject past dates
    - it should validate date format
    - it should handle timezone correctly
    - it should accept date exactly one day in future (boundary)
    - it should reject today's date
    - it should accept date at maximum allowed range
```

### Action Selector
```markdown
- [ ] T024 [P] [US2] Create ActionSelector component with comprehensive unit tests in src/components/trade/ActionSelector.tsx
  - Tests:
    - it should render STO/BTC options
    - it should change value on selection
    - it should handle disabled states
    - it should show current action
```

---

## Validator Examples

### Contract Validator (with boundary conditions)
```markdown
- [ ] T018 [P] [US2] Create OptionContractValidator with comprehensive unit tests in src/domain/validators/OptionContractValidator.ts
  - Tests:
    - it should accept valid OCC format
    - it should reject invalid OCC format
    - it should require expiration in future
    - it should verify strike matches position
    - it should accept expiration exactly one day out (boundary)
    - it should reject expiration on current date (boundary)
    - it should accept strike at minimum increment (0.50)
```

### Trade Validator (with boundary conditions)
```markdown
- [ ] T019 [P] [US2] Extend TradeValidator with STO validation with comprehensive unit tests
  - Tests:
    - it should accept STO before expiration
    - it should reject STO after expiration
    - it should verify action matches position type
    - it should accept STO on expiration date (boundary)
    - it should reject STO one day after expiration (boundary)
    - it should accept quantity at minimum (1 contract)
```

---

## Calculator Examples

### Cost Basis Calculator (with boundary conditions)
```markdown
- [ ] T029 [US3] Extend CostBasisCalculator with per-OCC-symbol FIFO with comprehensive unit tests
  - Tests:
    - it should apply FIFO for single contract
    - it should apply FIFO in correct order for multiple contracts
    - it should handle partial close matching
    - it should keep mixed symbols separate
    - it should handle single contract close (minimum quantity)
    - it should handle cost basis at zero (assigned shares)
    - it should maintain precision at small decimal values
```

### Realized P&L Calculator (with boundary conditions)
```markdown
- [ ] T034 [US3] Create RealizedPnLCalculator with comprehensive unit tests in src/domain/calculators/RealizedPnLCalculator.ts
  - Tests:
    - it should calculate full close P&L correctly
    - it should calculate partial close P&L correctly
    - it should apply FIFO matching order
    - it should handle multiple STO trades
    - it should handle breakeven (P&L exactly zero)
    - it should handle transition from profit to loss
    - it should handle minimum profit ($0.01)
```

---

## Service Examples

### Trade Service
```markdown
- [ ] T026 [US2] Extend TradeService.addOptionTrade() with comprehensive unit tests
  - Tests:
    - it should generate OCC symbol
    - it should validate STO timing
    - it should persist trade
    - it should update position status
```

---

## Task-Level Integration Test Examples

### Service Coordination (add after the service task)
```markdown
- [ ] T039 [US5] Create AssignmentService with comprehensive unit tests in src/services/AssignmentService.ts
  - Tests:
    - it should calculate cost basis (strike - premium)
    - it should create linked stock position
    - it should rollback atomic transaction on error

- [ ] T040 [US5] Integration test for AssignmentService coordination in tests/integration/assignment-service.test.ts
  - Tests:
    - it should call TradeService to close option
    - it should call PositionService to create stock
    - it should link positions together
    - it should rollback on failure
```

### Page Wiring (add after the wiring task)
```markdown
- [ ] T013 [US1] Wire CreatePosition page to support Short Put strategy in src/pages/CreatePosition.tsx

- [ ] T014 [US1] Integration test for CreatePosition Short Put wiring in tests/integration/create-position-wiring.test.ts
  - Tests:
    - it should render option fields in form
    - it should submit to PositionService
    - it should navigate to detail on success
    - it should show error on failure
```

### Workflow Orchestration
```markdown
- [ ] T048 [US5] Create AssignmentModal component with comprehensive unit tests
  - Tests:
    - it should handle multi-step navigation
    - it should support back button
    - it should persist state between steps
    - it should reset state on close

- [ ] T049 [US5] Integration test for assignment modal workflow in tests/integration/assignment-modal-flow.test.ts
  - Tests:
    - it should complete preview → thesis → journal → submit flow
    - it should preserve data on back navigation
    - it should create both positions on final submit
```

---

## Story-Level Integration Test Examples

### Complete User Flow
```markdown
### Integration Tests for User Story 1

> **Write after implementation is complete** to verify the full user flow

- [ ] T015 [US1] Integration test for Short Put plan creation flow in tests/integration/short-put-plan.test.ts
  - Tests:
    - it should complete UI flow from dashboard to plan saved
    - it should display validation errors inline
    - it should show plan in position list after save
```

### With Multiple Coverage Areas
```markdown
### Integration Tests for User Story 3

> **Write after implementation is complete** to verify the full user flow

- [ ] T031 [US3] Integration test for BTC close flow in tests/integration/btc-close.test.ts
  - Tests:
    - it should allow BTC from position detail
    - it should change position status to closed
    - it should display realized P&L correctly

- [ ] T032 [US3] Integration test for partial BTC flow in tests/integration/btc-partial.test.ts
  - Tests:
    - it should leave position open after partial close
    - it should show correct remaining quantity
    - it should allow multiple BTC until fully closed
```

### Display Feature (still needs integration test)
```markdown
### Integration Tests for User Story 7

> **Write after implementation is complete** to verify display works when wired

- [ ] T059 [US7] Integration test for intrinsic/extrinsic display in tests/integration/intrinsic-extrinsic-display.test.ts
  - Tests:
    - it should display values after price entry
    - it should show correct ITM/OTM indicator
    - it should update when price changes
```

---

## Writing Style Guide

### DO: Write "it should..." statements
- "it should render options"
- "it should reject negative values"
- "it should handle timezone correctly"
- "it should validate before save"

### DON'T: Use compact verb phrases without "it should"
- ~~"renders options"~~
- ~~"rejects negative"~~
- ~~"handles timezone"~~

### DO: Be specific about the condition
- "it should reject past dates"
- "it should enforce min value 0.01"
- "it should accept STO before expiration"

### DON'T: Be vague
- ~~"it should handle invalid input"~~
- ~~"it should work correctly"~~
- ~~"it should validate properly"~~

### DO: One test case per line
```markdown
- Tests:
  - it should render options
  - it should change value on selection
  - it should default to Long Stock
  - it should be keyboard accessible
```

### DON'T: Combine multiple tests on one line
- ~~"Tests: renders options, selection changes value, default to Long Stock"~~

### DO: Match test count to task type

| Task Type | Test Count |
|-----------|------------|
| UI Components (display, selectors, buttons) | 4-6 |
| Input Components (text, number, date) | 6-8 |
| Validators | 6-8 |
| Calculators/Business Logic | 6-8 |
| Services | 4-6 |
| Integration tests | 3-5 |

### DO: Include boundary conditions for inputs, validators, and calculators
- "it should accept value at exact minimum (0.01)"
- "it should reject value just below minimum (0.00)"
- "it should handle breakeven (P&L exactly zero)"

### DON'T: Forget boundary tests for task types that need them
- Input components, validators, and calculators commonly have bugs at boundaries
- Always include 2-3 boundary tests for these task types
