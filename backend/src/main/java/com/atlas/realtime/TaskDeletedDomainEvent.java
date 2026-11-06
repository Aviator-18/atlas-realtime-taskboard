package com.atlas.realtime;

import java.time.Instant;

public record TaskDeletedDomainEvent(
        Long boardId,
        Long actorId,
        Instant occurredAt,
        Long taskId
) implements BoardDomainEvent {

    @Override
    public String type() {
        return "TASK_DELETED";
    }
}
