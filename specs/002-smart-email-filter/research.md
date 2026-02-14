# Research: Smart Email Filter

**Feature**: 002-smart-email-filter
**Date**: 2026-02-14

## R1: AI Provider Abstraction (Anthropic + OpenAI-compatible)

**Decision**: Add provider-agnostic `AiProvider` interface under `src/adapters/ai/provider.ts` with two implementations: `AnthropicProvider` and `OpenAiProvider`.

**Rationale**:
- Spec requires configurable providers (FR-015/FR-016).
- Provider boundary belongs in adapters layer in this codebase.
- Keeps `services/smart_filter_service.ts` independent from SDK details.

**Implementation Notes**:
- `AI_PROVIDER` selects `anthropic` or `openai`.
- `AI_MODEL`, `AI_API_KEY`, optional `AI_BASE_URL` configure runtime.
- Factory `createAiProvider(config)` centralizes provider selection.

## R2: Batch Evaluation Strategy

**Decision**: Evaluate emails in dynamically sized batches based on token budget and show progressive updates after each batch.

**Rationale**:
- Meets FR-014 and SC-001.
- Avoids one-call-per-email latency/cost.
- Prevents context overflow across models with different windows.

**Implementation Notes**:
- `AI_MAX_CONTEXT_TOKENS` default: 32000.
- Reserve ~30% for prompt/response overhead.
- Estimate tokens as `chars / 4`.
- Always minimum batch size of 1.
- Implement in `src/services/batch_sizing.ts` and consume in `src/services/smart_filter_service.ts`.

## R3: Confidence Level Mapping

**Decision**: Map numeric confidence to levels: high (>=0.8), medium (>=0.5), low (<0.5).

**Rationale**:
- Satisfies FR-011.
- Keeps sorting by numeric confidence while rendering readable labels/colors.

## R4: TUI Integration (React/TSX + Ink)

**Decision**: Migrate TUI shell to TSX (`src/tui/app.tsx`) and add `ink-testing-library` for TUI tests.

**Rationale**:
- User explicitly requested React/TSX and `ink-testing-library`.
- Enables cleaner input/state composition for filter UX.

**Implementation Notes**:
- Add `src/tui/use_smart_filter.ts` for filter state lifecycle.
- Add `src/tui/filter_input.tsx` for input mode.
- Update `src/tui/inbox_list.tsx` for filtered count and confidence indicators.
- Extend `src/tui/input_controller.ts` with `f` activate and `Esc` clear behavior.
- Keep `src/tui/ink_runtime.ts` responsible for render/unmount lifecycle.

## R5: Error Handling and Missing Config

**Decision**: On missing AI config or provider errors, show clear error and preserve existing inbox view.

**Rationale**:
- FR-010 and FR-017 require graceful behavior.
- Prevents losing current list/detail context on failures.

**Implementation Notes**:
- `resolveAiConfig()` returns `null` when incomplete.
- `use_smart_filter` surfaces a user-safe message and leaves unfiltered view intact.
- Empty descriptions are rejected before calling provider (FR-013).

## R6: Config Model Update (Aligned to Existing Core Config)

**Decision**: Extend `AppConfig` in `src/core/config.ts` with optional AI fields rather than introducing a new config system.

**Rationale**:
- Strictly aligns with existing architecture.
- Avoids parallel config models.

**Implementation Notes**:
- Add optional fields for AI provider/model/apiKey/baseUrl/maxContextTokens.
- Keep Gmail config required.
- AI config remains optional globally but required at smart-filter runtime.
