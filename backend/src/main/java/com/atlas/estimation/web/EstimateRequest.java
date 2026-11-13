package com.atlas.estimation.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EstimateRequest(
        @NotNull(message = "boardId is required")
        Long boardId,

        @NotBlank(message = "title is required")
        @Size(min = 1, max = 120, message = "title must be between 1 and 120 characters")
        String title,

        @Size(max = 4000, message = "description cannot exceed 4000 characters")
        String description
) {
}
