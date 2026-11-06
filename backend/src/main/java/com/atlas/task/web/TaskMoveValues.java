package com.atlas.task.web;

public record TaskMoveValues(
        Long columnId,
        Long afterTaskId
) {
}
