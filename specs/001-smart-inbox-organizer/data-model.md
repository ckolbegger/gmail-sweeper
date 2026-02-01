# Data Model: Smart Inbox Organizer

## Entities

### Email (transient)
Represents a Gmail message shown in the UI. Not persisted after session end.

**Fields**
- `message_id` (string, unique)
- `thread_id` (string)
- `sender` (string)
- `subject` (string)
- `received_at` (datetime)
- `labels` (list of string)
- `category` (string)
- `is_read` (boolean)
- `snippet` (string, optional)
- `body` (string, optional; loaded on demand)

**Validation**
- `message_id` required and unique within a session.
- `received_at` must be a valid timestamp.

### SavedQuery
A stored natural-language query with optional action and execution order.

**Fields**
- `saved_query_id` (string, unique)
- `name` (string, optional)
- `query_text` (string, required)
- `action_type` (enum: label | archive | delete | none)
- `action_label` (string, optional; required when `action_type` = label)
- `order_index` (integer, required)
- `last_run_at` (datetime, optional)

**Validation**
- `query_text` is required and non-empty.
- `order_index` must be unique across saved queries for a user.
- `action_label` required when `action_type` = label.

### UserSession
Represents the most recent session used to define “new since last session.”

**Fields**
- `session_id` (string, unique)
- `started_at` (datetime)
- `last_session_at` (datetime)

**Validation**
- `last_session_at` must be <= `started_at`.

## Relationships

- A **UserSession** can reference many **SavedQuery** runs (implicit by last_run_at).
- A **SavedQuery** produces a list of **Email** results when executed.

## State Transitions

- **SavedQuery.last_run_at** updates after a successful run.
- **Email.is_read** may change based on Gmail state; treated as read-only metadata in the app.
