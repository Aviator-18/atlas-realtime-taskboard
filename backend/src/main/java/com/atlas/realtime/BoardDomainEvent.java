package com.atlas.realtime;

import java.time.Instant;

public sealed interface BoardDomainEvent permits
        TaskCreatedDomainEvent,
        TaskUpdatedDomainEvent,
        TaskMovedDomainEvent,
        TaskDeletedDomainEvent,
        BoardResyncDomainEvent,
        MemberJoinedDomainEvent {

    Long boardId();

    Long actorId();

    Instant occurredAt();

    String type();
}
