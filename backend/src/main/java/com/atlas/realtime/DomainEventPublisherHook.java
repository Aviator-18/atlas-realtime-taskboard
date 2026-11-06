package com.atlas.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class DomainEventPublisherHook {

    private static final Logger log = LoggerFactory.getLogger(DomainEventPublisherHook.class);

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBoardDomainEvent(BoardDomainEvent event) {
        log.debug("Committed domain event [type={}, boardId={}, actorId={}]",
                event.type(), event.boardId(), event.actorId());
    }
}
