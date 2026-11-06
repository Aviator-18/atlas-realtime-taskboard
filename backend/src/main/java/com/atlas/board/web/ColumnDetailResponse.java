package com.atlas.board.web;

import com.atlas.task.web.TaskResponse;

import java.util.List;

public record ColumnDetailResponse(
        Long id,
        String name,
        String kind,
        Integer position,
        List<TaskResponse> tasks
) {
}
