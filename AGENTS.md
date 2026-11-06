# Atlas: working agreement for coding agents

Atlas is a real-time collaborative task board with version-checked concurrent edits and AI-assisted effort estimates. It is a final-year B.Tech project that will be demonstrated to a faculty supervisor, so correctness, readability and honest documentation matter more than feature count.

## Source of truth

Read these before planning any work, and follow them over your own preferences:

- `docs/SPEC.md`: what to build, scope, acceptance criteria
- `docs/ARCHITECTURE.md`: stack, package layout, data model, protocols
- `docs/API_CONTRACT.md`: REST, WebSocket and estimation contracts
- `docs/DESIGN_SYSTEM.md`: visual and writing rules for the frontend

If these documents conflict or leave something ambiguous, stop and ask. Do not edit them unless asked.

## How to work

1. One phase at a time, as defined in `docs/PROMPTS.md`. Never start work that belongs to a later phase.
2. Plan first. List the files you will create or change and every new dependency. A dependency that is not named in `docs/ARCHITECTURE.md` needs approval before you add it.
3. Build in small steps. After each coherent unit, run the relevant build and tests, then commit using Conventional Commits (`feat`, `fix`, `test`, `docs`, `chore`, `refactor`; scope `backend`, `frontend` or `infra`; imperative mood).
4. Finish a task only with evidence: the exact command you ran and a summary of its real output (tests passed and failed). Never claim something works that you have not run.
5. If a test fails, fix the cause. Do not weaken, skip or delete tests to get green.
6. Do not present stubs as features. Anything intentionally unfinished goes into `docs/KNOWN_LIMITATIONS.md` and into your final report.

## Backend rules (Java 21, Spring Boot 3.x, Maven)

- Package by feature under `com.atlas`: `auth`, `board`, `task`, `realtime`, `estimation`, `common`. Inside a feature use `web`, `service` and `persistence` subpackages.
- Controllers hold no business logic. Services own transactions. Repositories are Spring Data interfaces.
- Never return JPA entities from controllers. Use Java records as request and response types.
- Constructor injection only. No Lombok. No field injection.
- Schema changes only through Flyway migrations. `spring.jpa.hibernate.ddl-auto` must be `validate`.
- Validate input with Bean Validation. Return errors as RFC 9457 problem details carrying the stable `code` values from `docs/API_CONTRACT.md`.
- Every task write (edit, move, delete) must compare versions exactly as described in the conflict protocol section of `docs/ARCHITECTURE.md`. Never overwrite a task without that comparison.
- Publish realtime events only after the database transaction has committed.
- Secrets come from environment variables. Nothing sensitive appears in source control, logs or error responses.
- Tests use JUnit 5 and AssertJ, with Testcontainers PostgreSQL for integration tests. Test names state behaviour, for example `rejects_stale_version_with_conflict`.

## Frontend rules (React, TypeScript strict, Vite)

- Feature folders under `src/features`, shared primitives under `src/components`. No component longer than about 200 lines.
- TypeScript strict mode. No `any`, and no non-null assertions used to silence the compiler. API types live in one file, `src/api/types.ts`, and mirror `docs/API_CONTRACT.md`.
- Server state through TanStack Query. Local UI state through React state. No global state library.
- Styling with Tailwind using the tokens in `docs/DESIGN_SYSTEM.md`. No UI component library. dnd-kit and lucide-react are the only UI dependencies allowed.
- Every interactive element is reachable by keyboard and has a visible focus state.

## Quality bar (reject your own work if it fails any of these)

- No emojis anywhere: UI, code, comments, logs, commit messages, documentation.
- No lorem ipsum, no Foo or Bar placeholders, no leftover TODO comments, no commented-out code, no unused imports or dependencies, no `console.log` or `System.out` in committed code.
- Comments explain why, not what. Names are specific to the domain (`BoardMembership`, not `DataHandler`).
- Seed data and interface copy are realistic for a software team. No invented statistics, testimonials or marketing language.
- The README and docs describe only what exists and works. No badges, screenshots or claims for features that are not built.

## Never

- Add features outside the scope in `docs/SPEC.md`.
- Change the public contract (endpoints, event shapes, error codes) without asking.
- Disable security checks, CORS restrictions or the version check to make something work.
- Run destructive commands (`git push --force`, `git reset --hard`, `rm -rf` outside build output, dropping databases) without asking.
