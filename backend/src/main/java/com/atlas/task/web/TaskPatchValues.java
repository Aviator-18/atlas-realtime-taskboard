package com.atlas.task.web;

import com.atlas.task.persistence.Priority;

import java.math.BigDecimal;

public record TaskPatchValues(
        Long version,
        boolean hasTitle,
        String title,
        boolean hasDescription,
        String description,
        boolean hasEstimateHours,
        BigDecimal estimateHours,
        boolean hasPriority,
        Priority priority,
        boolean hasAssigneeId,
        Long assigneeId,
        boolean hasMove,
        TaskMoveValues move
) {
}
