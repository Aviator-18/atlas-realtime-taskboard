# Phase prompts for Antigravity

Run one phase per conversation. Start a fresh conversation for each phase so the agent works from the documents instead of a long chat history. Paste the prompt block exactly, read the plan the agent produces before approving it, and check the acceptance list yourself before you commit and move on.

| Phase | Goal | Mode | Owner suggestion |
|---|---|---|---|
| 0 | Alignment, no code | Planning | Both |
| 1 | Scaffold, database, health check | Planning | Person A |
| 2 | Authentication | Planning | Person A |
| 3 | Boards, tasks, version-checked writes | Planning | Person A |
| 4 | Frontend foundation and board view | Planning | Person B |
| 5 | Drag and drop moves | Fast | Person B |
| 6 | Realtime sync | Planning | A (backend), B (client) |
| 7 | Conflict experience and two-client verification | Planning | Person B |
| 8 | Effort estimation | Planning | A (backend), B (interface) |
| 9 | Seed data, containers, documentation, audit | Planning | Both |

If weekly quota is limited, protect this order: 0, 1, 2, 3, 4, 5, 6, 7, then 8 (fallback heuristic first), then 9.

---

## Phase 0: Alignment (no code)

```
Read AGENTS.md and every file in docs/. Do not create or change any file.

Report back:
1. Atlas in five sentences, in your own words.
2. The ten constraints from the documents that you consider most important to get right.
3. Every contradiction, gap or ambiguity you found between the documents, each with the resolution you propose.
4. The exact dependency list you will use for the backend and the frontend, taken from docs/ARCHITECTURE.md.
5. Three risks you see in this design.

Ask me questions if anything is unclear. Wait for my answers before we continue.
```

Acceptance: the restatement matches the documents. The conflict protocol and the "publish after commit" rule appear among the constraints. No file was changed. Resolve any ambiguity by editing the docs yourself, then commit them.

---

## Phase 1: Scaffold, database, health check

```
Implement Phase 1 only.

Create the repository structure from docs/ARCHITECTURE.md section 3.

Backend: Spring Boot 3.x on Java 21 with Maven wrapper, the packages listed in AGENTS.md (empty feature packages need a package-info.java explaining their purpose), Flyway with db/migration/V1__init.sql containing exactly the schema in docs/ARCHITECTURE.md section 4 (include estimate_suggestions), application.yml and application-dev.yml reading the variables in section 10, Actuator exposing only /actuator/health, one Testcontainers-based test that starts the application against PostgreSQL and checks that the health endpoint returns UP and that Flyway applied V1.

Frontend: Vite React TypeScript in strict mode, Tailwind, the tokens from docs/DESIGN_SYSTEM.md in src/styles/tokens.css, Public Sans through @fontsource, ESLint, Vitest with one passing sample test, and a placeholder page that shows the product name only.

Infrastructure: docker-compose.yml that runs PostgreSQL 16 for development, .env.example, a .gitignore covering both projects, and a README that lists only what exists now (prerequisites, how to start the database, backend and frontend, how to run tests).

Make small Conventional Commits as you go. Show me the plan first.
```

Acceptance:
- `docker compose up -d db`, then `cd backend && ./mvnw verify` passes
- `cd frontend && npm install && npm run lint && npm test && npm run build` passes
- `/actuator/health` returns `UP` when the backend runs
- `git log` shows several small commits, no emojis, no secrets in the repository

Tag: `git tag phase-1`

---

## Phase 2: Authentication

```
Implement Phase 2 only: registration, login and the /api/me endpoint exactly as in docs/API_CONTRACT.md section 4, using the design in docs/ARCHITECTURE.md section 8.

Requirements:
- BCrypt password hashing, unique email compared case-insensitively
- JWT signing and verification with Spring Security's OAuth2 Resource Server (Nimbus). No hand-written JWT code.
- Refuse to start outside the dev profile when ATLAS_JWT_SECRET is missing or shorter than 32 bytes
- A single @RestControllerAdvice producing the problem details and codes in the contract, including VALIDATION_FAILED with a field error list
- CORS restricted to ATLAS_CORS_ORIGINS
- All other /api endpoints require authentication

Tests with Testcontainers: successful registration, duplicate email (409 EMAIL_TAKEN, also with different letter case), invalid input, successful login, wrong password and unknown email returning the same response, a protected endpoint rejecting a missing token and an expired token, and a valid token reaching /api/me.

Show me the plan first.
```

Acceptance:
- Registration and login work with `curl` (the agent shows the commands and output)
- Wrong password and unknown email produce identical bodies
- The password hash is never present in any response or log line
- `./mvnw verify` passes

Tag: `phase-2`

---

## Phase 3: Boards, tasks and version-checked writes

```
Implement Phase 3 only, backend only: board and task endpoints from docs/API_CONTRACT.md sections 5 and 6, with the ordering rules from docs/ARCHITECTURE.md section 5 and the conflict protocol from section 6.

Requirements:
- Creating a board creates the three default columns and the owner membership in one transaction, and a generated invite code from an alphabet without 0, O, 1, I, L
- Every board and task operation checks membership and returns 403 NOT_A_MEMBER otherwise
- PATCH uses JSON Merge Patch semantics: detect field presence by reading the body as a JsonNode and validating it in a dedicated parser class. Reject unknown fields. Support explicit null for estimateHours and assigneeId.
- Edit, move and delete all require the version and return 409 TASK_VERSION_CONFLICT with currentTask when stale, for both the early comparison and the Hibernate optimistic lock exception
- Moves compute the position on the server and set startedAt and completedAt as described in docs/SPEC.md US-07
- Column rebalancing when the gap is smaller than 2, without changing task versions
- Domain events are registered in the services but nothing is broadcast yet. Create the event types and publishing hook so Phase 6 can attach to it.

Tests (Testcontainers, no mocked database): the concurrency test described in docs/ARCHITECTURE.md section 12 (two threads, exactly one success, repeated 20 times), authorisation on every endpoint, stale version rejected for edit, move and delete, ordering cases (append, between, top, rebalance), and the timestamps rules.

Show me the plan first.
```

Acceptance:
- All tests pass, and the concurrency test runs 20 iterations without flaking
- Sabotage check: comment out the version comparison and the `@Version` annotation, run the concurrency test, confirm it fails, restore both
- No controller returns an entity or contains business logic
- Moving a card changes exactly one task row (check with the SQL log or a test)

Tag: `phase-3`

---

## Phase 4: Frontend foundation and board view

```
Implement Phase 4 only: the frontend shell, authentication screens, boards list and a board view that reads data and supports creating and editing tasks. No drag and drop and no realtime yet.

Follow docs/DESIGN_SYSTEM.md completely: tokens, Public Sans, layout, task card, drawer, buttons, fields, empty and loading states, and all strings through src/strings.ts. Follow docs/API_CONTRACT.md for every type, defined once in src/api/types.ts.

Include: sign in and register, token handling in memory and sessionStorage, a route guard, boards list with create and join dialogs, board view with columns and cards, a create task form, a task drawer for editing that sends the version, and error banners for failed requests. Edits must update the cache from the server response.

Do not build the estimation suggestion block yet. Do not add any dependency beyond those in docs/ARCHITECTURE.md.

After building, start the app, open it in the browser, and take screenshots of the sign in page, the empty boards page and a board with tasks. Compare them against the design document and list every deviation you see.

Show me the plan first.
```

Acceptance:
- You can register, sign in, create a board, create tasks and edit them through the interface
- Compare the screenshots against `DESIGN_SYSTEM.md` section 10 yourself: no gradients, no capital-letter labels, one radius used everywhere, no decorative icons
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass
- Keyboard: Tab reaches every control and the focus ring is visible

Tag: `phase-4`

---

## Phase 5: Drag and drop moves

```
Implement Phase 5 only: moving cards with dnd-kit (pointer and keyboard sensors), within a column and between columns.

On drop, send PATCH /api/tasks/{id} with the version and a move object (columnId and afterTaskId) as in the contract. Update the TanStack Query cache optimistically and roll back if the request fails. Show the drop indicator and dragging state exactly as in docs/DESIGN_SYSTEM.md. Announce pick up, move and drop for screen readers.

On a 409 TASK_VERSION_CONFLICT response, replace the card with the task in currentTask and keep a pending conflict marker on it. The banner itself comes in Phase 7, so leave a clearly named extension point.

Unit test the function that converts a drop target into columnId and afterTaskId.

Show me the plan first.
```

Acceptance:
- Cards move with the mouse and with the keyboard, and the order survives a page refresh
- A failed request visibly returns the card
- Dragging does not rotate or scale the card

Tag: `phase-5`

---

## Phase 6: Realtime sync

```
Implement Phase 6: live updates, following docs/ARCHITECTURE.md section 7 and docs/API_CONTRACT.md section 8.

Backend:
- STOMP over WebSocket at /ws with heartbeats
- A channel interceptor that validates the JWT in the CONNECT frame with the same JwtDecoder as the REST layer, and rejects SUBSCRIBE to /topic/boards/{boardId} for non-members and any other destination
- A listener using @TransactionalEventListener(phase = AFTER_COMMIT) that turns the domain events from Phase 3 into the contract's envelope and sends them with SimpMessagingTemplate
- BOARD_RESYNC after rebalancing
- Tests: an event is delivered to a subscribed member after a commit, nothing is delivered after a rolled back transaction, a non-member subscription is rejected, an unauthenticated connection is rejected

Frontend:
- A socket module with @stomp/stompjs: connect with the token, subscribe to the open board, reconnect with backoff, reload the board after every reconnect
- applyBoardEvent(state, event) as a pure function implementing the five reconciliation rules in section 7, with Vitest tests for duplicate, out of order, gap, delete and resync
- The connection state indicator from the design system
- Apply events to the TanStack Query cache

Do not add the live cue animation yet (Phase 7). Show me the plan first.
```

Acceptance:
- Open the same board in two browsers signed in as different users: create, edit, move and delete in one, and watch the other update without refreshing
- Stop the backend and restart it: the indicator shows "Reconnecting" then "Live", and the board reloads
- All backend and frontend tests pass

Tag: `phase-6`

---

## Phase 7: Conflict experience and two-client verification

```
Implement Phase 7: the live cue and conflict presentation.

1. The live cue from docs/DESIGN_SYSTEM.md section 6, including the caption text, the fade, the live region announcement and reduced motion behaviour. It must not fire for the current user's own changes.
2. Conflict presentation from section 7: the banner attached to the card, the "Apply my change again" and "Dismiss" actions, the drawer behaviour that preserves the user's draft, and the deleted task case.
3. Verification. Use the browser to run this scenario with two separate sessions as two different users on the same board: both open the same task, one saves a new title, the other then saves a new priority from the old version. Confirm that the second save is rejected, the banner appears with the correct text, and the card shows the first user's title. Record what you observed with screenshots.
4. Add a Playwright test for that scenario using two browser contexts, if Playwright can be added with approval. Otherwise write the scenario as a manual test in docs/REVIEW_AND_DEMO.md.

Show me the plan first.
```

Acceptance:
- The scenario in step 3 works in front of you, not only in the agent's report
- The live cue appears for a teammate's change and never for your own
- Strings match `DESIGN_SYSTEM.md` section 8

Tag: `phase-7`

---

## Phase 8: Effort estimation

```
Implement Phase 8: effort and priority suggestions, following docs/SPEC.md section 6, docs/ARCHITECTURE.md section 9 and docs/API_CONTRACT.md section 7.

Backend, in this order:
1. HeuristicEstimator as a pure class with table-driven unit tests covering every rule in the fallback description.
2. EstimationProvider interface and OpenAiCompatibleEstimationProvider using RestClient with timeouts from configuration.
3. EstimationService: build the prompt from the draft task and up to five completed tasks with estimates from the same board (most recently completed first), call the provider, validate the reply strictly, and fall back to the heuristic on any failure. Record latency.
4. The per-user sliding window limiter (10 per minute) and the endpoint with the 429 behaviour.
5. The suggestion log and the suggestionId handling on task creation, if time allows.
6. Tests with a test double for the provider: valid reply, reply wrapped in a code fence, malformed JSON, out of range estimate, invalid priority, timeout, and no configured key. Every case must produce a well formed 200 response.

Frontend: the suggestion block in the create task form exactly as in docs/DESIGN_SYSTEM.md, including the loading, result, fallback and rate limited states. The block never applies values by itself.

The prompt text must be the one in docs/ARCHITECTURE.md. Show me the plan first.
```

Acceptance:
- With no key configured, a suggestion still works and says it came from keywords
- With a valid key, a suggestion says it came from the language model and the rationale refers to similar completed tasks where they exist
- Disconnect the network or use a wrong key: the request still returns within about 5 seconds with a fallback suggestion
- No API key appears in logs, responses or the repository

Tag: `phase-8`

---

## Phase 9: Seed data, containers, documentation, audit

```
Implement Phase 9.

1. Development seed: a runner active only in the dev profile that creates the users, board and fourteen tasks described in docs/SPEC.md section 7. It must be idempotent and must refuse to run in any other profile. Task titles and descriptions must be realistic for a checkout or payments service.
2. Containers: multi-stage Dockerfiles for backend and frontend (non-root user, no secrets), and a docker-compose.yml that starts db, backend and frontend with one command. Add a healthcheck for the database and make the backend wait for it.
3. Documentation: rewrite README.md so that it describes only what exists: what Atlas is, the stack with exact versions, how to run it with Docker and for development, the environment variables, the project structure, how to run the tests, the architecture summary with the two Mermaid diagrams from docs/ARCHITECTURE.md, and the conflict guarantee in one paragraph. Create docs/KNOWN_LIMITATIONS.md listing everything that is simplified or missing, honestly.
4. Optional: a GitHub Actions workflow for backend verify and frontend lint, typecheck, test and build.
5. Audit. Act as a strict reviewer of the whole repository against the quality bar in AGENTS.md and the rules in docs/DESIGN_SYSTEM.md section 10. List every violation with file and line. Do not fix anything until I approve the list.

Show me the plan first.
```

Acceptance:
- On a fresh clone: `cp .env.example .env`, `docker compose up --build` starts everything, and the seeded board is usable
- The README contains no claim you cannot demonstrate
- The audit list is real, and you have read it

Tag: `phase-9`

---

## Recovery prompts

When the agent drifts:

```
Stop. You changed files outside the scope of this phase. List every file you touched that this phase does not require, revert those changes, and tell me which sentence in the documents you misread.
```

When a test fails and the agent starts to weaken it:

```
Do not change the test. Explain the root cause of the failure in the production code, propose the smallest fix, and wait for my approval.
```

When output looks generic:

```
Compare the current interface with docs/DESIGN_SYSTEM.md section 10. List each place where it uses a default that the document forbids, and fix those places only.
```

When the plan is too large:

```
Split this plan into steps that each leave the project compiling and tested. Implement only the first step and stop.
```
