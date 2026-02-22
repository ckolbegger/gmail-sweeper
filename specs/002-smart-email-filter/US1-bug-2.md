# Bug: Interactive Smart Filter Does Not Use AI Config from .env

**Found by:** User report + code-path verification  
**Target:** US1 — Filter Inbox by Natural Language Description  
**Discovery:** Real usage with configured environment  
**Severity:** major

## Steps to Reproduce

1. Set AI env values in `.env`:
   - `AI_PROVIDER`
   - `AI_MODEL`
   - `AI_API_KEY`
2. Launch app in interactive mode.
3. Open smart filter and submit any valid description.
4. Observe error stating AI provider/config is missing.

## Expected Behavior

- Interactive smart filter should use AI settings loaded from `.env`/process env.
- If env is configured, provider should be created and filter should proceed to evaluation.

## Actual Behavior

- Interactive filter path reports provider/config missing even when AI env variables are set.

## Evidence

- `src/cli/app.ts` does not call `resolveAiConfig()` for interactive session startup.
- `src/cli/app.ts` does not construct `createAiProvider(config)` or pass provider into `runInkSession`.
- `src/tui/app.ts` filter flow expects `provider` in command deps; missing provider triggers config error path.

## Relevant Files

- `src/cli/app.ts`
- `src/core/config.ts`
- `src/adapters/ai/provider.ts`
- `src/tui/app.ts`

## Analysis

AI config resolution exists in core config, but interactive CLI wiring does not currently connect that config to TUI smart-filter dependencies. As a result, the TUI falls into its "provider missing" error path even with correctly populated environment variables.
