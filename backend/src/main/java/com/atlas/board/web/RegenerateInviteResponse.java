package com.atlas.board.web;

import java.time.Instant;

public record RegenerateInviteResponse(
        String inviteCode,
        Instant inviteCodeExpiresAt
) {
}
