package com.atlas.realtime;

import com.atlas.task.web.TaskResponse;

import java.time.Instant;

public record TaskCreatedDomainEvent(
        Long boardId,
        Long actorId,
        Instant occurredAt,
        TaskResponse task
) implements BoardDomainEvent {

    @Override
    public String type() {
        return "TASK_CREATED";
    }
}
