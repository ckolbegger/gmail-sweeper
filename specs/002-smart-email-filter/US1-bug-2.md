# Bug: "AI provider not configured" error lacks configuration guidance

**Found by:** tui-exploratory-tester
**Target:** US1 — Filter Inbox by Natural Language Description
**Discovery:** Exploratory testing — error recovery
**Severity:** minor

## Steps to Reproduce

1. Start the app with `./gmail-sweep` (with NO AI provider configured — no AI_PROVIDER, AI_API_KEY env vars set)
2. Press `f` to activate smart filter
3. Type any description (e.g., "invitations to an event") and press Enter
4. Observe the error message

## Expected Behavior

Per FR-017: System MUST display a clear error message **directing the user to configure a provider**. The message should tell the user HOW to fix the problem, e.g., "AI provider not configured. Set AI_PROVIDER and AI_API_KEY environment variables. See .env.example for details."

## Actual Behavior

The error message simply says "AI provider not configured" with no guidance on what to do about it. A user unfamiliar with the application's configuration would not know how to resolve this.

## Evidence

### Terminal Capture
```text
Gmail Inbox (50 emails)

AI provider not configured

>* New automated Squeeze Simpler Trading   today
 ...
j/k or Up/Down to navigate * Enter to preview * q to quit * Ctrl+R to refresh * f to filter
```

## Relevant Files

- `src/tui/hooks/useSmartFilter.ts` — line 56: `setError('AI provider not configured')` — message is too terse
- `src/core/ai/config.ts` — `resolveAiConfig()` returns null but provides no details about what's missing

## Analysis

The error message should include actionable guidance. At minimum: "AI provider not configured. Set AI_PROVIDER and AI_API_KEY environment variables." Ideally it could say which specific variable is missing (e.g., "AI_PROVIDER not set" vs "AI_API_KEY not set").
