# Test Categories by Task Type

Apply relevant categories based on what the task creates.

---

## UI Components

### Render/Display
- renders with default props
- renders with all optional props
- displays correct initial state
- shows/hides conditional elements
- renders empty state

### User Interaction
- click triggers handler
- selection changes value
- input accepts valid values
- form submission works
- keyboard navigation works

### Validation Feedback
- shows error on invalid input
- clears error on valid input
- displays inline validation messages
- highlights invalid fields

### Edge Cases
- handles missing/null props
- handles empty collections
- handles long text/overflow
- handles rapid interactions

### Accessibility
- keyboard accessible
- has proper ARIA labels
- focus management correct
- screen reader friendly

---

## Input Components (Text, Number, Date)

### Happy Path
- accepts valid input
- displays current value
- triggers onChange with value

### Validation
- rejects invalid format
- rejects out-of-range values
- enforces min/max constraints
- shows validation error

### Type-Specific
- **Number**: rejects non-numeric, accepts decimals, handles negative
- **Date**: rejects past dates, handles timezone, valid format
- **Text**: handles special characters, respects maxLength

### Boundary Conditions
- accepts value at exact minimum
- accepts value at exact maximum
- rejects value just below minimum
- rejects value just above maximum
- handles zero when zero is valid boundary

---

## Selector/Dropdown Components

### Core Behavior
- renders all options
- selection changes value
- displays current selection
- handles disabled state

### Defaults
- shows default selection
- no selection when required empty

---

## Validators

### Valid Cases
- accepts valid input (multiple examples)
- returns success/true for valid

### Invalid Cases
- rejects each invalid condition
- returns appropriate error message

### Boundary Conditions
- accepts value at valid boundary
- rejects value at invalid boundary
- handles off-by-one scenarios
- tests inclusive vs exclusive limits

### Edge Cases
- handles null/undefined
- handles empty strings
- handles type mismatches

---

## Calculators/Business Logic

### Core Calculations
- calculates correctly (happy path)
- handles multiple scenarios
- matches expected precision

### Edge Cases
- handles zero values
- handles negative values
- handles very large numbers
- handles decimal precision

### Boundary Conditions
- calculates correctly at minimum input
- calculates correctly at maximum input
- handles threshold transitions (e.g., profit to loss)
- tests rounding at decimal boundaries

### FIFO/Matching (if applicable)
- matches in correct order
- handles partial matches
- handles exact matches
- handles remaining unmatched

---

## Services

### CRUD Operations
- creates successfully
- reads existing record
- updates correctly
- deletes successfully

### Validation Integration
- rejects invalid input
- returns validation errors
- handles concurrent operations

### State Changes
- updates status correctly
- triggers side effects
- maintains consistency

---

## Integration Tests

### Task-Level Integration Tests

Add when a task coordinates multiple components or services.

#### Service Coordination
- service calls validator before persisting
- service updates related entities atomically
- rollback on partial failure
- returns complete object with all relations

#### Page/Component Wiring
- form submits to correct service
- service response updates UI state
- navigation occurs after success
- error displays in correct location

#### Workflow Orchestration
- multi-step process completes end-to-end
- state preserved between steps
- can go back and forward
- final action persists all data

---

## Story-Level Integration Tests

Every story needs integration tests. Apply these categories:

### Critical User Flows (Required)
- complete happy path from user action to result
- user sees confirmation of success
- data persists and is retrievable
- subsequent views show updated data

### Validation Flows
- invalid input shows error inline
- user corrects error and resubmits
- corrected submission succeeds
- no partial data saved on validation failure

### Cross-Component Interactions
- data flows UI → Service → Storage
- data flows Storage → Service → UI (on load)
- updates in one view reflect in another
- list updates after detail changes

### State Transitions
- status changes reflect in UI immediately
- status-dependent actions enable/disable correctly
- status history is preserved

### Error Scenarios
- network/storage errors show user-friendly message
- user can retry after error
- no data corruption on error
