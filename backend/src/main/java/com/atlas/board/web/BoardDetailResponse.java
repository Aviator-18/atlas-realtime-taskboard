package com.atlas.board.web;

import java.util.List;

public record BoardDetailResponse(
        Long id,
        String name,
        String inviteCode,
        List<MemberResponse> members,
        List<ColumnDetailResponse> columns
) {
}
