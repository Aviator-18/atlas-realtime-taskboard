package com.atlas.task.web;

import java.math.BigDecimal;
import java.time.Instant;

public record TaskResponse(
        Long id,
        Long boardId,
        Long columnId,
        String title,
        String description,
        Integer position,
        BigDecimal estimateHours,
        String priority,
        String rationale,
        Long assigneeId,
        Long version,
        Long createdBy,
        Instant createdAt,
        Instant updatedAt,
        Instant startedAt,
        Instant completedAt
) {
}
