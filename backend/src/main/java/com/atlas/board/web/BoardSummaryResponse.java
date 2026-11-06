package com.atlas.board.web;

import com.fasterxml.jackson.annotation.JsonInclude;

public record BoardSummaryResponse(
        Long id,
        String name,
        String role,
        long memberCount,
        @JsonInclude(JsonInclude.Include.NON_NULL)
        String inviteCode
) {
}
