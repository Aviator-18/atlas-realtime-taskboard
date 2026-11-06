# Atlas product specification

## 1. Summary

Atlas is a web application where a team keeps its work on a shared board of columns and tasks. Three properties define it:

1. **Live.** When one member changes the board, every other member sees the change within about a second, without refreshing.
2. **Safe under concurrent edits.** Two people editing the same task at the same moment never silently overwrite each other. The later write is rejected, the user is told, and the latest version is shown.
3. **Assisted planning.** When a task is created, a language model suggests an effort estimate and a priority, grounded in the team's own completed tasks. The suggestion is advisory. A person always accepts or edits it.

Primary audience: student project teams and small software teams. Secondary audience: supervisors and reviewers who want to see how real-time sync and concurrency control are implemented.

## 2. Scope

### Must (the dry run is not complete without these)

- Registration, login, JWT authentication
- Boards with default columns, membership through an invite code
- Task create, edit, move, delete, all version-checked
- Drag and drop moves with optimistic update and rollback
- Live sync of every task change to all connected members
- Conflict detection with clear feedback in the interface
- Automatic reconnection with a visible connection state
- Effort and priority suggestion with a timeout and a deterministic fallback
- Seed data for a realistic demo
- Docker Compose to run the whole system with one command
- Automated tests for the properties above, a README that matches reality

### Should (build if time allows, in this order)

1. Suggestion log that records whether a suggestion was accepted, edited or ignored
2. Member joined event so the member list updates live
3. Two-browser end-to-end test with Playwright
4. GitHub Actions workflow running backend and frontend checks

### Will not be built

Roles beyond owner and member, presence indicators, comments, attachments, notifications, file upload, mobile app, dark theme, internationalisation, email flows, password reset, social login.

## 3. Actors

- **Owner:** the member who created the board. Same permissions as a member in this version; the role is stored for future use.
- **Member:** can read the board and create, edit, move and delete tasks.
- **Non-member:** receives HTTP 403 on every board or task endpoint and cannot subscribe to the board's live channel.

## 4. User stories and acceptance criteria

**US-01 Register and sign in.**
Given a new email and a password of at least 10 characters, when I register, then my account is created and I am signed in. Given wrong credentials, when I sign in, then I see one generic message that does not reveal whether the email exists. Passwords are stored only as BCrypt hashes.

**US-02 Create a board.**
When I create a board with a name, then it is created with three columns named "To do", "In progress" and "Done" (kinds `TODO`, `IN_PROGRESS`, `DONE`), I become its owner, and it receives an 8 character invite code using an alphabet without look-alike characters (no 0, O, 1, I, L).

**US-03 Join a board.**
Given a valid invite code, when I join, then I become a member. Joining twice changes nothing and returns the board. An unknown code returns 404 with code `INVALID_INVITE_CODE`.

**US-04 View a board.**
When I open a board I belong to, then I see its columns in order and each column's tasks ordered by position.

**US-05 Create a task.**
Given a title of 1 to 120 characters, an optional description up to 4000 characters and a target column, when I create the task, then it appears at the bottom of that column for every connected member.

**US-06 Edit a task.**
When I change the title, description, estimate, priority or assignee and save, then the task's version increases by one and every member sees the change. If the version I sent is stale, see US-10.

**US-07 Move a task.**
When I drag a task to another position or column, then the card moves immediately for me (optimistic), the server stores the new column and position, and other members see the move. Entering a column of kind `IN_PROGRESS` for the first time sets `startedAt`. Entering a column of kind `DONE` sets `completedAt`. Leaving `DONE` clears `completedAt`.

**US-08 Delete a task.**
When I delete a task I send the version I last saw. If it is stale the delete is rejected with a conflict, so I cannot remove work someone has just changed.

**US-09 Live updates.**
When another member creates, edits, moves or deletes a task, then my screen reflects it within about one second. The changed card briefly shows who changed it (see the design system).

**US-10 Conflicts.**
Given two members editing the same task from the same version, when both save, then exactly one write succeeds. The other receives HTTP 409 `TASK_VERSION_CONFLICT` with the latest task. The interface reverts the card to the latest state, explains what happened, and keeps the user's unsaved draft where possible. No write is ever lost silently.

**US-11 Connection resilience.**
When the connection drops, then the interface shows "Reconnecting", retries with backoff, and on success reloads the board so no missed event leaves the view stale.

**US-12 Suggest an estimate.**
When I ask for a suggestion while creating a task, then I see an estimate in hours, a priority, a one sentence rationale and a label that says whether it came from the language model or from the rule-based fallback. The suggestion is never applied without my action. If the model does not answer within 5 seconds or returns an unusable answer, the fallback is used and the label says so.

**US-13 Estimate history.**
Completed tasks that carry an estimate are the examples given to the model (up to five, most recently completed first).

## 5. Non-functional requirements

| Area | Requirement |
|---|---|
| Latency | Target: 95th percentile of change propagation under 500 ms for 20 concurrent clients on one instance. Measure it, do not assume it. |
| Security | BCrypt hashing, JWT checked on every REST request and on the WebSocket handshake, membership check on every board operation and subscription, input validation, CORS allow-list, secrets only in environment variables |
| Reliability | The estimate endpoint never fails because the model failed. The client reconnects automatically. |
| Accessibility | Keyboard operable, visible focus, text contrast of at least 4.5:1, live region announcements for remote changes |
| Portability | `docker compose up` starts database, backend and frontend |
| Maintainability | Layered backend, interface-based estimation provider, automated tests, no unused code |

## 6. Estimation behaviour

- Input: the draft task (title, description) and up to five completed tasks from the same board.
- Output: `estimateHours` (0.5 to 40 in steps of 0.5), `priority` (`LOW`, `MEDIUM`, `HIGH`), `rationale` (at most 200 characters), `source` (`LLM` or `FALLBACK`).
- The model provider is configured by environment variables. Any service that offers an OpenAI-compatible chat completions endpoint must work without code changes (for example Gemini through its compatibility endpoint, Groq, or a local Ollama server).
- Task text is untrusted. It is sent to the model as data, and instructions inside it are ignored.
- Each user may request at most 10 suggestions per minute.

## 7. Demo dataset

A development-only seed creates:

- Three users: Priya Nair, Arjun Mehta, Sana Qureshi. Addresses on the reserved `example.test` domain. One shared development password, documented in the README.
- One board named "Checkout API, sprint 12" with the three default columns.
- Fourteen tasks with realistic titles and descriptions for a payments or checkout service. Six are completed, each with an estimate and plausible `startedAt` and `completedAt` values, so that suggestions have real history to draw on. The rest are spread across "To do" and "In progress" with a mix of priorities and assignees.

The seed must be idempotent and must refuse to run outside the `dev` profile.
