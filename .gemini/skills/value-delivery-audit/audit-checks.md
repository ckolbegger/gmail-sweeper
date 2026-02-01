# Value Delivery Audit Checks

For EVERY user story, apply these four checks to ensure the value loop is complete.

---

## 1. The "See It" Check (Perceptibility)

**Question**: If a user performs the primary action of this story, can they immediately see the result in the UI *without* needing future stories?

### What to Look For

- Story creates data but display is in a later story
- Story calculates values but no UI shows them yet
- Story changes state but no visual indicator reflects it

### Pattern

```
Story 1: Create Short Put Position
Story 5: Position List with Strategy Badge
```

### Red Flag

The user cannot verify "Create Position" worked without checking the database or waiting for Story 5. The list/badge logic must exist or be pulled forward.

### Verification Process

1. Identify what the story creates/changes
2. Search for UI components that display this data: `Grep` for field names
3. Read the component file to confirm it renders the new data
4. If component exists but doesn't handle new case, flag as broken loop

### Fix

Move or add basic display logic to the creation story. The minimum viable display can be enhanced later, but *something* must show the result.

---

## 2. The "Click It" Check (Accessibility)

**Question**: Does the user have a natural path to reach this feature, or is the navigation/trigger deferred?

### What to Look For

- Page/modal created but no link/button to open it
- Action handler created but no UI element triggers it
- Detail view created but list doesn't link to it

### Pattern

```
Story 2: Assignment Modal with multi-step flow
Story 5: Add "Record Assignment" button to Position Actions
```

### Red Flag

The modal is orphaned code. Integration tests would have to manually render the modal or force the URL. Real users have no way to reach it.

### Verification Process

1. Identify what UI the story creates (page, modal, panel)
2. Search for navigation to it: `Grep` for component name, route path
3. Read parent components to confirm trigger exists
4. If no trigger found in current or earlier stories, flag as broken loop

### Fix

Move the navigation link/button to the story that builds the target. The trigger and target belong together.

---

## 3. The "Verify It" Check (Testability)

**Question**: Can we write a true integration test for this story *right now* using only what exists?

### What to Look For

- Story claims to deliver calculation but logic is stubbed
- Story claims feature works but depends on unbuilt service
- Integration test would require mocking something that should exist

### Pattern

```
Story 1: Display Realized P&L on Position Detail
Story 3: Implement RealizedPnLCalculator
```

### Red Flag

Story 1 claims to show P&L but the calculator doesn't exist yet. The story is "shipped" but shows wrong/zero values. The integration test would fail or require mocks.

### Verification Process

1. Identify what the story claims to deliver
2. Trace the data flow: UI → Service → Calculator → Data
3. Check each step exists: `Glob` for files, `Read` to verify methods
4. If any step is missing or stubbed, flag as broken loop

### Fix

Pull the logic implementation into the story that first exposes it. A feature isn't delivered until it actually works.

---

## 4. The "Complete It" Check (Data Integrity)

**Question**: Does the story handle the full lifecycle of the transaction?

The full lifecycle is: **Validation → Persistence → Confirmation**

### What to Look For

- Form exists but validation is in a later story
- Data is saved but no success confirmation shown
- Action is performed but error handling is deferred

### Pattern

```
Story 2: Trade Entry Form with all fields
Story 4: TradeValidator with quantity and date rules
```

### Red Flag

Users can submit invalid trades in Story 2. The form is "shipped" but broken — bad data enters the system. This creates data corruption that's hard to fix later.

### Verification Process

1. Identify what data the story collects/modifies
2. Check for validation: `Grep` for validator usage in form/service
3. Read the validator to confirm rules exist for new fields
4. Check for confirmation: success message, redirect, status update
5. If validation or confirmation missing, flag as broken loop

### Fix

Move validation logic into the story that introduces the form. The form and its validation are inseparable.

---

## Applying the Checks

### For Each User Story:

1. **State the Value Loop**: "[User] does [Action] and sees [Result]"
2. **Run All Four Checks**: See It, Click It, Verify It, Complete It
3. **Verify Against Codebase**: Don't trust task descriptions — read the code
4. **Document Findings**: Cite specific files and task IDs
5. **Recommend Fixes**: Be specific about what moves where

### Example Analysis

**Story: US2 - Execute Sell-to-Open Trade**

Value Loop: "Trader adds STO trade and sees position status change to 'open'"

| Check | Status | Evidence |
|-------|--------|----------|
| See It | ✓ | T023 updates PositionDetail, verified in `src/components/position/PositionDetail.tsx:142` |
| Click It | ✓ | T020 adds trade form, accessible from position detail page |
| Verify It | ✓ | T021 implements TradeService.addOptionTrade(), T024 integration test |
| Complete It | ⚠️ | T017 TradeValidator exists but deferred — form can submit before validation ready |

**Recommendation**: Move T017 (TradeValidator STO rules) before T020 (TradeForm) to ensure validation exists when form ships.
