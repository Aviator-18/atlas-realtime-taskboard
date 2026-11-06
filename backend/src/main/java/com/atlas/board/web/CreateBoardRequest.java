package com.atlas.board.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateBoardRequest(
        @NotBlank(message = "Board name is required")
        @Size(min = 1, max = 100, message = "Board name must be between 1 and 100 characters")
        String name
) {
}
