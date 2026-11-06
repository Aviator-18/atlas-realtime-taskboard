package com.atlas.board.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record JoinBoardRequest(
        @NotBlank(message = "Invite code is required")
        @Size(min = 8, max = 8, message = "Invite code must be exactly 8 characters")
        String inviteCode
) {
}
