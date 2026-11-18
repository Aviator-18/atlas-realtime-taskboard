package com.atlas.board.web;

import java.time.Instant;
import java.util.List;

public record BoardDetailResponse(
        Long id,
        String name,
        String inviteCode,
        Instant inviteCodeExpiresAt,
        List<MemberResponse> members,
        List<ColumnDetailResponse> columns
) {
    public BoardDetailResponse(Long id, String name, String inviteCode, List<MemberResponse> members, List<ColumnDetailResponse> columns) {
        this(id, name, inviteCode, null, members, columns);
    }
}
