# Review checklist and demo guide

Generated code only counts as your proof of work if you can read it, run it and defend it. This document is how you do that.

## 1. Review after every phase

Spend ten minutes per phase on this, before you commit.

1. `git diff --stat`. Does the list of files match what the plan promised? Anything unexpected is a question for the agent.
2. Read the diff of the core files (see section 2 for which ones matter most). Ask of every unfamiliar line: what does this do, and what breaks if I delete it?
3. Run the build and tests yourself. Do not rely on the agent's report.
4. Use the feature by hand, including one failure case.
5. Commit, tag, and write two sentences in your own words about what the phase added. Keep these notes: they become the report.

## 2. The files you must be able to explain

| Topic | Where to look |
|---|---|
| Version check and conflict response | `task/service/TaskService`, the exception handler, `TASK_VERSION_CONFLICT` |
| Why a move changes one row | position calculation in `task/service`, and the ordering tests |
| After-commit publishing | `realtime/TaskEventPublisher` and the test that proves a rollback publishes nothing |
| WebSocket authentication and authorisation | `realtime/StompAuthInterceptor` |
| Client event reconciliation | `applyBoardEvent` and its tests |
| Model call, validation and fallback | `estimation/service/EstimationService`, `HeuristicEstimator` |
| JWT issue and verification | `common/security` configuration |

## 3. Quality audit (run before showing anyone)

Each check should return nothing or something you can justify.

```bash
# Leftovers
grep -rnE "TODO|FIXME|XXX" backend/src frontend/src
grep -rnE "console\.log|System\.out" backend/src frontend/src
grep -rn "lorem ipsum" -i backend frontend docs

# Emojis and symbol pictographs in source and docs
grep -rnP "[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}]" backend/src frontend/src docs README.md

# Loose typing and silenced compiler checks in the frontend
grep -rnE ": any\b|as any|@ts-ignore|!\." frontend/src

# Unused dependencies
(cd frontend && npx depcheck)
(cd backend && ./mvnw dependency:analyze)

# Everything still builds from clean
(cd backend && ./mvnw clean verify)
(cd frontend && npm ci && npm run lint && npm run typecheck && npm test && npm run build)
```

Then read these with your own eyes:

- **README truth test.** For each sentence in the README, can you demonstrate it right now? Delete the ones you cannot.
- **Git history.** `git log --oneline`. Commits should be small, in imperative mood, and describe one change each. If the history is three giant commits, rewrite it before the demo or be ready to explain why.
- **Sabotage test.** Temporarily remove the version comparison and the `@Version` annotation. The concurrency test must fail. Restore them. A test that still passes proves nothing.
- **Interface against the design document.** Open the app next to `DESIGN_SYSTEM.md` section 10 and tick off each forbidden default.
- **Secrets.** `git log -p | grep -iE "api[_-]?key|secret|password"` shows nothing real.

## 4. Dry run rehearsal checklist

- Fresh clone in a new folder, `cp .env.example .env`, `docker compose up --build`: it starts without manual fixes.
- Seed data loads. Three users can sign in with the documented development password.
- Two browser windows side by side (use a normal and a private window for two users).
- Test the model suggestion with a valid key and once with the key removed, so you can show both labels.
- Internet failure plan: a 90 second screen recording of the full flow, saved locally.
- Backup plan: the same demo running locally in Docker if any hosted service fails.

## 5. Demo script (about 8 minutes)

1. **Frame it (30 seconds).** "Atlas is a shared task board that stays in sync across users, handles simultaneous edits safely, and suggests effort estimates from the team's own history."
2. **Board and task (1 minute).** Open the seeded board as Priya. Create a task. Click "Suggest estimate". Point at the source label: "This one came from the model, and when it is unavailable the system says so and uses a rule-based estimate." Use the suggestion.
3. **Live sync (2 minutes).** Second window as Arjun. Move a card in one window, and let the supervisor watch it move in the other, with the "Moved by" cue. Edit a title. Delete a card.
4. **Conflict (2 minutes).** Open the same task in both windows. Save a new title in one. Save a new priority in the other from the old view. Show the banner and the card reverting to the first user's version. "Neither write was lost silently. The second was rejected, and the user decides what happens next."
5. **Resilience (30 seconds).** Stop the backend container, show "Reconnecting", start it again, show "Live" and the board reloading.
6. **Under the hood (1.5 minutes).** Show the sequence diagram from the README, then the test that fires two updates at once and asserts exactly one succeeds.
7. **Honest limits (30 seconds).** Single instance broker, tokens in session storage, estimation accuracy not yet evaluated at scale, and what you would build next.

## 6. Questions a supervisor may ask

| Question | Where your answer lives |
|---|---|
| Why optimistic concurrency and not locking? | Conflicts are rare on boards with many tasks, locks would block people during their thinking time, and the version check detects the rare conflict without coordination. Cite Kung and Robinson, and the Optimistic Offline Lock pattern. |
| Why not OT or CRDTs? | Tasks are coarse records, not character streams. A version check gives the same no-lost-update guarantee with a fraction of the complexity. They become relevant for collaborative description editing. |
| What happens if the event is published but the commit fails? | It cannot happen: events are published after commit, and a test proves a rollback publishes nothing. |
| What if a client misses an event? | Versions let the client detect a gap and reload the board. Reconnect always reloads. |
| How do you stop one user reading another team's board? | Membership check on every REST call and on every STOMP subscription, with tests for both. |
| How do you know the estimates are any good? | Not yet established. The suggestion log records acceptance, and the evaluation compares mean absolute error against a baseline. Be precise about what you have and have not measured. |
| What if the model returns garbage or is slow? | Strict validation, a 5 second timeout, and a deterministic fallback. Show the unit tests. |
| Why does a move touch only one row? | Integer positions with gaps, and the server computes the midpoint. Rebalancing is rare and does not alter versions. |
| What would break at 10,000 users? | The in-memory broker (needs a Redis or RabbitMQ relay), connection limits, and per-board event fan-out. |
| Which parts did you write and which did the agent write? | Section 7. |

## 7. Describing the use of an AI coding agent

Check what your department allows, and be straightforward about it. A defensible account is accurate and specific:

- You wrote the specification, the architecture, the data model, the conflict protocol, the API contract and the design rules. These are in `docs/` and in your commit history.
- An AI coding agent produced the first implementation of each phase from those documents.
- You reviewed every diff, wrote or verified the tests that prove the guarantees, ran the system, fixed what was wrong, and can explain each design decision.

## 8. Phase 7 verification: Two-session conflict and live cue procedure

Follow these steps with two separate browser windows (Window A: Arjun, Window B: Priya) on the same board:

1. **Setup:**
   - Window A: Sign in as Arjun (`arjun@example.com`), open board "Checkout API, sprint 12".
   - Window B: Open an incognito or private window, sign in as Priya (`priya@example.com`), open the same board.
   - Verify connection indicators in both windows show "Live".

2. **Live Cue Check:**
   - In Window A, move task "Fix refund rounding" to "In progress".
   - In Window B, observe the task card:
     - 3 px accent bar on the left edge and accent-wash background.
     - Caption under the title reads "Moved by Arjun" for 4 seconds.
     - Live announcement region announces "Arjun moved Fix refund rounding to In progress".
     - Bar and wash fade out over 2.4 seconds starting after 1.6 seconds.
   - In Window A, verify that no cue appeared for your own change.

3. **Conflict Presentation Check:**
   - In Window A, click the task card to open the drawer.
   - In Window B, click the same task card to open the drawer. Both clients are looking at version N.
   - In Window A, change the title to "Fix refund rounding for currency conversions" and click "Save changes".
   - Window A saves successfully (version becomes N+1).
   - In Window B (still displaying old version N), change Priority from "Medium" to "High", and click "Save changes".
   - Confirm Window B's save is rejected with HTTP 409 `TASK_VERSION_CONFLICT`.
   - In Window B:
     - The drawer stays open and preserves Priya's unsaved draft (Priority remains "High").
     - An inline warning banner appears at the top of the drawer: "Arjun changed this task before your change was saved. Your change was not applied." with actions "Apply my change again" and "Dismiss".
     - The drawer's displayed version updates to N+1 so that saving again is a deliberate act.
     - The task card on the board snaps to Arjun's title ("Fix refund rounding for currency conversions") and attaches the same conflict banner.
   - In Window B, click "Apply my change again" in the drawer:
     - The change is re-applied against version N+1.
     - Save succeeds (version becomes N+2).
     - The conflict banner is cleared, and the card updates to High priority.


If you cannot explain a part of the code, learn it or remove it before the demo. Understanding the system is what makes it a credible entry on your resume, and it is the part interviewers will test.

## 8. Two-person working agreement

- One feature branch per phase, merged into `main` through a pull request that the other person reviews and understands.
- Commit under your own names. Do not squash the history into one commit.
- Swap roles at least once so that both of you have read the backend and the frontend code.
- Keep a shared notes file with the two sentences per phase from section 1.
