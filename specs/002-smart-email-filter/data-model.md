# Data Model: Smart Email Filter

**Feature**: `002-smart-email-filter`

This feature uses existing `Email` and `Config` models, and introduces new ephemeral state for the filtering process.

## Ephemeral State (Filtering)

### EmailClassification
Single result from AI evaluation.

```typescript
interface EmailClassification {
  emailId: string;
  matches: boolean;
  confidence: number; // 0.0–1.0
  reasoning?: string;
}
```

### ConfidenceLevel
Mapped from numeric confidence for UI display.

```typescript
type ConfidenceLevel = 'high' | 'medium' | 'low';
```

## Configuration

The following keys are added to the application configuration:

| Key | Description |
|-----|-------------|
| `AI_PROVIDER` | 'gemini' \| 'anthropic' \| 'openai' |
| `AI_MODEL` | Model ID (e.g., 'gemini-1.5-flash', 'claude-3-haiku-20240307') |
| `AI_API_KEY` | API Key for the selected provider |
| `AI_BASE_URL` | Optional: base URL for OpenAI-compatible proxies |
| `AI_MAX_CONTEXT_TOKENS` | Token budget for batching (default: 32000) |
