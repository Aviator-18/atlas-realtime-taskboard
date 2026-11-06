# Known Limitations

This document tracks known limitations and intentionally deferred features by phase.

## Phase 1 Limitations

1. **Scope restriction.** Only the repository structure, V1 schema migration, configuration scaffolding, and health check endpoints are implemented. Application domain controllers, authentication, board management, task mutations, STOMP messaging, and estimation endpoints are planned for subsequent phases (Phases 2 through 8).
2. **Integration testing environment.** Backend integration tests use Testcontainers with PostgreSQL 16. In environments without an active Docker daemon, Testcontainers will fail with `IllegalStateException: Could not find a valid Docker environment`. Docker or an equivalent OCI runtime is required to execute integration tests locally.
3. **In-memory WebSocket broker.** As designed in the architecture specification, the simple STOMP broker operates in-memory on a single backend instance. Distributed scale-out with Redis or RabbitMQ relay is deferred.
4. **Token storage.** Frontend session management stores tokens in memory and sessionStorage; production hardening with secure httpOnly cookies is noted as a future operational consideration.

## Phase 3 Limitations

1. **Realtime event broadcasting.** Domain events for task creations, updates, moves, deletions, board resyncs, and member joins are captured upon transaction commit via `DomainEventPublisherHook`, but broadcasting over WebSocket/STOMP destinations is intentionally deferred until Phase 6.
2. **AI-assisted estimation.** The `/api/tasks/estimate` endpoint is intentionally deferred to Phase 8; suggestion outcome logging (`ACCEPTED`/`EDITED`) is in place when `suggestionId` is supplied during task creation.
