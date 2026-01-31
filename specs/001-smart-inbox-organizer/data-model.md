# Data Model

## Core Entities

### Email
Represents a single message in the inbox.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique Gmail Message ID |
| `threadId` | `string` | ID of the thread this email belongs to |
| `sender` | `string` | "From" header |
| `subject` | `string` | Subject line |
| `date` | `Date` | Date received |
| `snippet` | `string` | Short preview text |
| `body` | `string` | Full content |
| `labels` | `string[]` | Gmail labels |
| `isUnread` | `boolean` | Derived from labels |
| `matchReason` | `string?` | Explanation of match (UI only) |

### FilterCriteria
The semantic definition of what we are looking for.

| Field | Type | Description |
|-------|------|-------------|
| `targetDescription` | `string` | The NL description (e.g. "Financial offers") |
| `sensitivity` | `enum` | HIGH/MEDIUM/LOW |

### SavedWorkflow
A persistent rule for filtering and acting on emails.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique ID |
| `name` | `string` | User display name |
| `targetDescription` | `string` | The NL query |
| `actionTemplate` | `ActionRequest?` | Optional default action |
| `order` | `number` | Execution order |
| `lastRunAt` | `Date?` | Time of last execution |

### MatchResult
Result of evaluating an email.

| Field | Type | Description |
|-------|------|-------------|
| `emailId` | `string` | ID of the email evaluated |
| `isMatch` | `boolean` | True if matched |
| `reason` | `string` | Why it matched |

### ActionRequest
Represents a user intent.

| Field | Type | Description |
|-------|------|-------------|
| `emailIds` | `string[]` | Target emails |
| `actionType` | `enum` | ARCHIVE, DELETE, LABEL |
| `labelName` | `string?` | If action is LABEL |
