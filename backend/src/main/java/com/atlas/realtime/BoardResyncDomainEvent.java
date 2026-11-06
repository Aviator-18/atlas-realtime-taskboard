package com.atlas.realtime;

import java.time.Instant;

public record BoardResyncDomainEvent(
        Long boardId,
        Long actorId,
        Instant occurredAt
) implements BoardDomainEvent {

    @Override
    public String type() {
        return "BOARD_RESYNC";
    }
}
