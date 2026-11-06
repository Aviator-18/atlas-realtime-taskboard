package com.atlas.task.service;

import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.web.TaskResponse;

public final class TaskMapper {

    private TaskMapper() {
    }

    public static TaskResponse toResponse(TaskEntity task) {
        if (task == null) {
            return null;
        }
        return new TaskResponse(
                task.getId(),
                task.getBoardId(),
                task.getColumnId(),
                task.getTitle(),
                task.getDescription(),
                task.getPosition(),
                task.getEstimateHours(),
                task.getPriority() != null ? task.getPriority().name() : null,
                task.getAiRationale(),
                task.getAssigneeId(),
                task.getVersion(),
                task.getCreatedBy(),
                task.getCreatedAt(),
                task.getUpdatedAt(),
                task.getStartedAt(),
                task.getCompletedAt()
        );
    }
}
