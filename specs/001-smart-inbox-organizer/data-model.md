# Data Model: Smart Inbox Organizer

**Feature**: `001-smart-inbox-organizer`

## Core Entities

### Email
Represents a single message retrieved from Gmail.

```typescript
interface Email {
  id: string;           // Gmail Message ID
  threadId: string;     // Gmail Thread ID
  internalDate: number; // Timestamp
  labelIds: string[];   // ["INBOX", "UNREAD", ...]
  snippet: string;      // Short preview
  payload: {
    headers: EmailHeader[];
    body: {
        text?: string;
        html?: string;
    };
  };
  // Computed helpers
  from: string;
  subject: string;
  isUnread: boolean;
}

interface EmailHeader {
  name: string;
  value: string;
}
```

### Workflow
A user-saved automation rule.

```typescript
interface Workflow {
  id: string;           // UUID
  name: string;         // User-friendly name e.g., "Newsletters"
  query: string;        // Natural language query e.g., "Find newsletters"
  filterCriteria?: FilterCriteria; // Cached structured criteria (optional optimization)
  action?: WorkflowAction;
  lastRunAt: number | null; // Timestamp
  order: number;        // Sort order
}

interface WorkflowAction {
  type: 'ARCHIVE' | 'DELETE' | 'LABEL';
  labelId?: string; // If type is LABEL
}
```

### FilterQuery (AI Output)
The structured interpretation of a natural language query.

```typescript
interface FilterQuery {
  originalQuery: string;
  gmailSearchQuery: string; // The generated "q" parameter for Gmail API (e.g., "from:x subject:y")
  explanation: string;      // Why this filter was chosen (for UI feedback)
}
```

## Persistence Schema (JSON)

File: `~/.config/gmail-sweep/workflows.json`

```json
{
  "version": 1,
  "workflows": [
    {
      "id": "uuid-1",
      "name": "Financials",
      "query": "Bank statements",
      "order": 0,
      "lastRunAt": 1706659200000
    }
  ],
  "preferences": {
    "pageSize": 50
  }
}
```