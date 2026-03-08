# Data Model: AI Summary

## Entities

### `EmailSummary`

Represents the AI-generated summary data for a specific email.

**Fields**:
- `emailId` (string): Unique identifier linking the summary to the original Gmail message ID.
- `description` (string): A one-sentence description of the email's content.
- `actionItems` (string[]): A list of actionable items extracted from the email.
- `createdAt` (string, ISO 8601 date): Timestamp of when the summary was generated.

**Relationships**:
- Belongs to an `Email` (1:1 relationship based on `emailId`).

## Storage Format

**File**: `~/.config/gmail-sweep/summaries.json`

```json
{
  "summaries": {
    "18a3b5c7d9e0f1a2": {
      "emailId": "18a3b5c7d9e0f1a2",
      "description": "Project Alpha status update indicating a delay in the backend rollout.",
      "actionItems": [
        "Review the revised backend timeline by Tuesday.",
        "Schedule a sync with the frontend team to adjust dependencies."
      ],
      "createdAt": "2026-03-07T14:30:00Z"
    }
  }
}
```

## State Transitions

The UI will transition through the following states for a given email:
- `idle`: Showing full email content. User can press 's'.
- `loading`: Request sent to the LLM. UI shows a loading indicator.
- `summary`: Displaying the generated (or cached) summary. User can press 's' to return to `idle`.
- `error`: LLM request failed. UI shows an error message.
