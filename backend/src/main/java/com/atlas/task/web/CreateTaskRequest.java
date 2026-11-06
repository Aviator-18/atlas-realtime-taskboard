package com.atlas.task.web;

import com.atlas.task.persistence.Priority;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record CreateTaskRequest(
        @NotNull(message = "columnId is required")
        Long columnId,

        @NotNull(message = "title is required")
        @Size(min = 1, max = 120, message = "title must be between 1 and 120 characters")
        String title,

        @Size(max = 4000, message = "description cannot exceed 4000 characters")
        String description,

        @DecimalMin(value = "0.5", message = "estimateHours must be at least 0.5")
        @DecimalMax(value = "40.0", message = "estimateHours cannot exceed 40.0")
        BigDecimal estimateHours,

        Priority priority,

        @Size(max = 200, message = "rationale cannot exceed 200 characters")
        String rationale,

        Long suggestionId
) {
}
