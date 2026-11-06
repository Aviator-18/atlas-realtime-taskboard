package com.atlas.board.web;

public record MemberResponse(
        Long id,
        String displayName,
        String role
) {
}
