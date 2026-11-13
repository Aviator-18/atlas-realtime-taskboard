package com.atlas.realtime;

import com.atlas.task.web.TaskResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;

@Component
public class TaskEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(TaskEventPublisher.class);

    private final SimpMessagingTemplate messagingTemplate;

    public TaskEventPublisher(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onBoardDomainEvent(BoardDomainEvent event) {
        TaskResponse task = null;
        Long taskId = null;

        if (event instanceof TaskCreatedDomainEvent e) {
            task = e.task();
        } else if (event instanceof TaskUpdatedDomainEvent e) {
            task = e.task();
        } else if (event instanceof TaskMovedDomainEvent e) {
            task = e.task();
        } else if (event instanceof TaskDeletedDomainEvent e) {
            taskId = e.taskId();
        }

        String eventId = UUID.randomUUID().toString();
        BoardEventEnvelope envelope = new BoardEventEnvelope(
                eventId,
                event.type(),
                event.boardId(),
                event.actorId(),
                event.occurredAt(),
                task,
                taskId
        );

        String destination = "/topic/boards/" + event.boardId();
        log.debug("Publishing live event [{}] to {} for actor {}", event.type(), destination, event.actorId());
        messagingTemplate.convertAndSend(destination, envelope);
    }
}
