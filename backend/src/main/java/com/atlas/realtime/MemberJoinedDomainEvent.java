package com.atlas.realtime;

import java.time.Instant;

public record MemberJoinedDomainEvent(
        Long boardId,
        Long actorId,
        Instant occurredAt,
        Long memberId
) implements BoardDomainEvent {

    @Override
    public String type() {
        return "MEMBER_JOINED";
    }
}
