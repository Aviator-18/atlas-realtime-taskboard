# Atlas API contract

Version 1. This document is the single definition of every request, response and event. The backend and the frontend both implement it. Change it only deliberately.

## 1. Conventions

- Base path `/api`. JSON in and out, UTF-8. Field names are camelCase.
- Timestamps are ISO 8601 in UTC with a `Z` suffix. Identifiers are integers.
- Authenticated endpoints require `Authorization: Bearer <token>`.
- Enumerations are uppercase strings: priority `LOW | MEDIUM | HIGH`, column kind `TODO | IN_PROGRESS | DONE | OTHER`, role `OWNER | MEMBER`.
- Estimates are hours as a number with one decimal at most, from 0.5 to 40.

## 2. Error format

Errors follow RFC 9457 problem details with one extra field, `code`, that clients may rely on.

```json
{
  "type": "https://atlas.local/problems/task-version-conflict",
  "title": "Task changed since you loaded it",
  "status": 409,
  "detail": "Another member saved this task first.",
  "code": "TASK_VERSION_CONFLICT",
  "currentTask": { "id": 7, "version": 4, "title": "Fix refund rounding" }
}
```

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_FAILED` | Invalid body. Includes `errors: [{ "field": "title", "message": "..." }]` |
| 401 | `UNAUTHENTICATED` | Missing, expired or invalid token |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password. One generic message for both |
| 403 | `NOT_A_MEMBER` | Caller is not a member of the board |
| 404 | `BOARD_NOT_FOUND`, `TASK_NOT_FOUND`, `COLUMN_NOT_FOUND`, `INVALID_INVITE_CODE` | Resource does not exist |
| 409 | `EMAIL_TAKEN` | Registration with an existing email |
| 409 | `TASK_VERSION_CONFLICT` | Stale `version`. Body includes `currentTask` |
| 429 | `ESTIMATION_RATE_LIMITED` | More than 10 suggestions per minute |

## 3. Shared types

```json
// User
{ "id": 3, "displayName": "Priya Nair", "email": "priya.nair@example.test" }

// Member
{ "id": 3, "displayName": "Priya Nair", "role": "OWNER" }

// Task
{
  "id": 7,
  "boardId": 1,
  "columnId": 2,
  "title": "Fix refund rounding",
  "description": "Refunds of partial amounts are off by one paisa for some currencies.",
  "position": 3072,
  "estimateHours": 3.0,
  "priority": "HIGH",
  "rationale": null,
  "assigneeId": 5,
  "version": 3,
  "createdBy": 3,
  "createdAt": "2026-11-09T08:30:12.114Z",
  "updatedAt": "2026-11-09T09:02:40.551Z",
  "startedAt": "2026-11-09T09:02:40.551Z",
  "completedAt": null
}
```

## 4. Authentication endpoints

### POST /api/auth/register

Request: `{ "displayName": "Priya Nair", "email": "priya.nair@example.test", "password": "at-least-ten-chars" }`
Rules: display name 1 to 80 characters, valid email up to 254 characters, password 10 to 72 characters.
Response `201`: `{ "token": "<jwt>", "expiresAt": "2026-11-09T17:30:00Z", "user": User }`

### POST /api/auth/login

Request: `{ "email": "...", "password": "..." }`
Response `200`: same shape as register. Wrong credentials: `401 INVALID_CREDENTIALS`.

### GET /api/me

Response `200`: `User` for the token's subject.

## 5. Board endpoints

### GET /api/boards

Response `200`: `[ { "id": 1, "name": "Checkout API, sprint 12", "role": "OWNER", "memberCount": 3 } ]`

### POST /api/boards

Request: `{ "name": "Checkout API, sprint 12" }` (1 to 100 characters)
Response `201`: `{ "id": 1, "name": "...", "role": "OWNER", "memberCount": 1, "inviteCode": "K7M2QX9R" }`
Creates the columns "To do", "In progress" and "Done" in one transaction.

### POST /api/boards/join

Request: `{ "inviteCode": "K7M2QX9R" }`
Response `200`: board summary as above. Idempotent. Unknown code: `404 INVALID_INVITE_CODE`.

### GET /api/boards/{boardId}

Members only. Response `200`:

```json
{
  "id": 1,
  "name": "Checkout API, sprint 12",
  "inviteCode": "K7M2QX9R",
  "members": [ Member ],
  "columns": [
    { "id": 1, "name": "To do", "kind": "TODO", "position": 1024, "tasks": [ Task ] }
  ]
}
```

Columns ordered by `position`. Tasks within a column ordered by `position`.

## 6. Task endpoints

### POST /api/boards/{boardId}/tasks

Request:

```json
{
  "columnId": 1,
  "title": "Add idempotency key to payment intents",
  "description": "Clients retry on timeout and currently create duplicates.",
  "estimateHours": 4.0,
  "priority": "HIGH",
  "rationale": "Similar to the completed webhook retry task, which took 4 hours.",
  "suggestionId": 12
}
```

`columnId` and `title` are required (title 1 to 120 characters, description up to 4000). `estimateHours`, `priority` (default `MEDIUM`), `rationale` (up to 200 characters) and `suggestionId` are optional. The client sends `rationale` only when the person used a suggestion. It is stored once at creation and is not editable afterwards. If `suggestionId` is present and the suggestion log exists, mark it `ACCEPTED` when estimate and priority equal the suggestion, otherwise `EDITED`.
Response `201`: `Task`, appended to the bottom of the column.

### PATCH /api/tasks/{taskId}

JSON Merge Patch semantics (RFC 7396). `version` is required. Any other field that is present is applied. A field that is absent is unchanged. `estimateHours` and `assigneeId` may be set to `null` to clear them. Unknown fields are rejected with `VALIDATION_FAILED`.

Editable fields: `title`, `description`, `estimateHours`, `priority`, `assigneeId`, and one optional `move` object.

```json
{
  "version": 3,
  "title": "Fix refund rounding for partial refunds",
  "priority": "HIGH",
  "assigneeId": null,
  "move": { "columnId": 3, "afterTaskId": 9 }
}
```

`move.afterTaskId` is the task the card was dropped under, or `null` for the top of the column. It must belong to the target column and must not be the task itself. The server computes the new position and updates `startedAt` and `completedAt` as defined in the specification.
Response `200`: updated `Task` with `version` increased by one. Stale version: `409 TASK_VERSION_CONFLICT`.

### DELETE /api/tasks/{taskId}?version=3

Response `204`. Stale version: `409 TASK_VERSION_CONFLICT`. Missing task: `404 TASK_NOT_FOUND`.

## 7. Estimation endpoint

### POST /api/tasks/estimate

Members of the board only.

Request: `{ "boardId": 1, "title": "Add idempotency key to payment intents", "description": "..." }`

Response `200`:

```json
{
  "suggestionId": 12,
  "estimateHours": 4.0,
  "priority": "HIGH",
  "rationale": "Similar to the completed webhook retry task, which took 4 hours.",
  "source": "LLM",
  "latencyMs": 1180
}
```

`source` is `LLM` or `FALLBACK`. `suggestionId` is present only when the suggestion log is built. This endpoint answers `200` even when the model fails, using the fallback. It returns `429` when rate limited.

## 8. Live events

Connect to `/ws` (STOMP over WebSocket). Send `Authorization: Bearer <token>` as a header of the `CONNECT` frame. Subscribe to `/topic/boards/{boardId}`. Clients never send application messages.

Envelope:

```json
{
  "eventId": "6f1c7a52-3d5e-4f0b-9f5f-1a2b3c4d5e6f",
  "type": "TASK_MOVED",
  "boardId": 1,
  "actorId": 5,
  "occurredAt": "2026-11-09T09:14:22.381Z",
  "task": { Task },
  "taskId": null
}
```

| `type` | Payload | Meaning |
|---|---|---|
| `TASK_CREATED` | `task` | A task was created |
| `TASK_UPDATED` | `task` | Fields changed |
| `TASK_MOVED` | `task` | Column or position changed (may also carry field changes) |
| `TASK_DELETED` | `taskId` | A task was removed |
| `BOARD_RESYNC` | none | Positions were rebalanced, reload the board |
| `MEMBER_JOINED` | `member` (optional, Should) | A member joined |

The client rules for applying events are in `docs/ARCHITECTURE.md`, section 7.

## 9. Health

`GET /actuator/health` is public and returns `{ "status": "UP" }`. No other actuator endpoint is exposed.
