package com.atlas.realtime;

import com.atlas.task.web.TaskResponse;

import java.time.Instant;

public record BoardEventEnvelope(
        String eventId,
        String type,
        Long boardId,
        Long actorId,
        Instant occurredAt,
        TaskResponse task,
        Long taskId
) {
}
