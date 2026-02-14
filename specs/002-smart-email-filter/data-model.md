# Data Model: Smart Email Filter

**Feature**: 002-smart-email-filter
**Date**: 2026-02-14

## Entities

### FilterDescription

Represents the user's natural language filter input.

| Field | Type | Description |
|-------|------|-------------|
| text | string | The natural language description entered by the user |
| status | `'idle', 'input', 'loading', 'filtered', 'error'` | Current filter evaluation state |
| errorMessage | string? | Error message if evaluation failed |

**Lifecycle**: Created when user submits filter text. Destroyed when filter is cleared.

### MatchResult

The AI's evaluation of a single email against the filter description.

| Field | Type | Description |
|-------|------|-------------|
| emailId | string | Gmail message ID |
| matches | boolean | Whether the email matches the filter |
| confidence | number | Confidence score 0.0–1.0 |
| confidenceLevel | `'high' \| 'medium' \| 'low'` | Discrete confidence level |
| reasoning | string? | Optional AI explanation |

**Derivation Rules**:
- `confidenceLevel`: high if confidence ≥ 0.8, medium if ≥ 0.5, low if < 0.5
- Only emails where `matches === true` are shown in the filtered view

### FilteredView

Temporary view state while a smart filter is active.

| Field | Type | Description |
|-------|------|-------------|
| description | string | Active filter description text |
| results | MatchResult[] | All evaluation results (matches and non-matches) |
| matchingEmails | Email[] | Emails that matched, sorted by confidence desc |
| totalEvaluated | number | Number of emails evaluated so far |
| totalEmails | number | Total emails to evaluate |
| batchesCompleted | number | Number of batches processed |
| batchesTotal | number | Total batches expected |

**Sorting**: Matching emails sorted by confidence descending (FR-012).

### AiProviderConfig

Configuration for the AI service.

| Field | Type | Description |
|-------|------|-------------|
| provider | `'anthropic' \| 'openai'` | AI provider type |
| model | string | Model identifier (e.g., `claude-sonnet-4-5-20250929`) |
| apiKey | string | API key for authentication |
| baseUrl | string? | Custom API endpoint (OpenAI-compatible only) |
| maxContextTokens | number | Max context window in tokens (default: 32000) |

**Source**: Environment variables (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_CONTEXT_TOKENS`) or config file.

## Relationships

```
FilterDescription 1──* MatchResult
     │
     └── creates → FilteredView
                       │
                       └── references → Email[] (from existing inbox state)

AiProviderConfig ──used by──> evaluation process
```

## State Transitions

### Filter Lifecycle

```
[No Filter] ──(user presses 'f')──> [Input Mode]
    ^                                     │
    │                            (user submits text)
    │                                     │
    │                                     v
    │                              [Evaluating]
    │                               │       │
    │                          (success)  (error)
    │                               │       │
    │                               v       v
    │                          [Filtered]  [Error]
    │                               │       │
    └──────(user presses Esc)───────┘───────┘
```

### Batch Evaluation Flow

```
[Start] → [Estimate tokens per email] → [Calculate batch size from token budget]
              │
              v
       [Batch 1: emails 1..N] → [Show partial results]
                                       │
                                       v
                                [Batch 2: emails N+1..M] → [Update results]
                                                                  │
                                                                  v
                                                           [Batch K: remaining] → [Filtered]
```

**Dynamic batch sizing**: Each batch fits as many emails as the token budget allows (~70% of `maxContextTokens`). Batch size varies based on actual email metadata length.
