# Research: Email Action Keys — Archive & Delete

**Feature**: 004-claude-email-actions | **Date**: 2026-03-01

---

## R-001: Centralized vs. Per-Component Key Handling

**Question**: Should `EmailPreview` add its own `e`/`#` `useInput` handler, or is the centralized `useKeyboard` handler sufficient?

**Decision**: Centralized handler only (`useKeyboard`).

**Rationale**: Ink's `useInput` fires for every subscriber simultaneously when a key is pressed. If both `useKeyboard` and `EmailPreview` subscribe to `e`, both will fire — resulting in double invocations. Since there is exactly one selected email (always `displayEmails[keyboard.selectedIndex]`), there is no ambiguity about which email to act on. A single handler in `useKeyboard` with an `onArchive`/`onDelete` callback is sufficient for both the list pane and the preview pane.

**Alternatives considered**:
- Per-component handlers: Rejected — double-fire risk; also requires threading `client` into `EmailPreview`, breaking the presentational contract.
- Focus-based routing (Ink's `useFocus`): Rejected — YAGNI; adds unnecessary complexity for a feature that has no ambiguity about the target.

---

## R-002: Transient Error Display in Ink TUI

**Question**: How to show a short-lived error message without a blocking modal or altering the existing layout significantly?

**Decision**: Add an `actionError: string | null` field to `useEmailActions`. `app.tsx` renders it as an additional line in the footer area. It auto-clears after 4 seconds via a `useEffect`/`setTimeout` in `app.tsx`.

**Rationale**: The existing app already has a footer `<Text dimColor>` line for navigation hints. Appending a conditional error line (colored red) below it is the lowest-friction change. No new component is required.

**Alternatives considered**:
- Flash in the email list header: Consistent with existing filter status row, but intermixed with navigation info.
- Ink's `<Static>` component: Could be used but makes layout harder to reason about.
- Selected: Footer line — consistent with existing pattern, simple to implement and test.

---

## R-003: `#` Key Reachability in Ink's `useInput`

**Question**: Does the `#` character (Shift+3) arrive as `input === '#'` in Ink's `useInput`, or does it require special handling?

**Decision**: `input === '#'` works correctly in Ink 4.0.

**Rationale**: Ink's `useInput` receives the decoded character string from the terminal. Shift+3 produces the `#` character at the OS/terminal level before the character reaches Node.js stdin. No special modifier handling is needed — `if (input === '#')` is the correct check.

**Alternatives considered**:
- Checking `key.shift && input === '3'`: Incorrect — Ink does not expose raw modifier+key combos for printable characters; it delivers the resolved character.

---

## R-004: Optimistic Update + Revert Pattern

**Question**: What is the right pattern for optimistic removal with rollback?

**Decision**: Remove from state immediately in `useGmail` (via a new `removeEmail(id)` callback), then call the API. On failure, re-insert at the original index.

**Rationale**: This gives instant visual feedback (required by SC-002 — "within one rendering frame"). The original index is captured before removal and passed to the revert function.

**Implementation shape**:

```ts
// In useGmail
const removeEmail = useCallback((id: string) => {
  setState(prev => ({ ...prev, emails: prev.emails.filter(e => e.id !== id) }));
}, []);

const restoreEmail = useCallback((email: Email, index: number) => {
  setState(prev => {
    const next = [...prev.emails];
    next.splice(index, 0, email);
    return { ...prev, emails: next };
  });
}, []);
```

**Alternatives considered**:
- Wait for API then update state: Rejected — violates SC-002 (no instant feedback).
- Re-fetch from server on failure: Rejected — slower, requires network round-trip; revert at original index is simpler and sufficient.

---

## R-005: In-Flight Guard

**Question**: How to prevent double-action on the same email?

**Decision**: Track in-flight email IDs in a `Set<string>` state. Key handler becomes a no-op if the email is already in-flight.

**Rationale**: Simple and stateless — no queue or lock mechanism needed for single-item actions. The guard lives in `useEmailActions`.

**Alternatives considered**:
- Disable keys globally while any action is in-flight: Too restrictive — user should be able to navigate while one action completes.
- Debounce: Doesn't prevent a second distinct press between debounce windows.

---

## Summary

All unknowns resolved. No new dependencies required. No changes to `GmailClient`, `EmailPreview`, or `EmailList`. The implementation touches three existing files and adds one new hook.
