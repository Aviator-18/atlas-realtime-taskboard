package com.atlas.task.service;

import com.atlas.auth.persistence.UserRepository;
import com.atlas.board.persistence.BoardColumnEntity;
import com.atlas.board.persistence.BoardColumnRepository;
import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.board.persistence.ColumnKind;
import com.atlas.board.service.ColumnNotFoundException;
import com.atlas.common.FieldErrorDetail;
import com.atlas.common.JsonPatchValidationException;
import com.atlas.common.NotAMemberException;
import com.atlas.estimation.persistence.EstimateSuggestionEntity;
import com.atlas.estimation.persistence.EstimateSuggestionOutcome;
import com.atlas.estimation.persistence.EstimateSuggestionRepository;
import com.atlas.realtime.BoardResyncDomainEvent;
import com.atlas.realtime.TaskCreatedDomainEvent;
import com.atlas.realtime.TaskDeletedDomainEvent;
import com.atlas.realtime.TaskMovedDomainEvent;
import com.atlas.realtime.TaskUpdatedDomainEvent;
import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import com.atlas.task.web.CreateTaskRequest;
import com.atlas.task.web.TaskMoveValues;
import com.atlas.task.web.TaskPatchValues;
import com.atlas.task.web.TaskResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final UserRepository userRepository;
    private final EstimateSuggestionRepository estimateSuggestionRepository;
    private final TaskOrderingService taskOrderingService;
    private final Clock clock;
    private final ApplicationEventPublisher eventPublisher;

    public TaskService(TaskRepository taskRepository,
                       BoardColumnRepository boardColumnRepository,
                       BoardMemberRepository boardMemberRepository,
                       UserRepository userRepository,
                       EstimateSuggestionRepository estimateSuggestionRepository,
                       TaskOrderingService taskOrderingService,
                       Clock clock,
                       ApplicationEventPublisher eventPublisher) {
        this.taskRepository = taskRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.boardMemberRepository = boardMemberRepository;
        this.userRepository = userRepository;
        this.estimateSuggestionRepository = estimateSuggestionRepository;
        this.taskOrderingService = taskOrderingService;
        this.clock = clock;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public TaskResponse createTask(Long boardId, CreateTaskRequest request, Long userId) {
        if (!boardMemberRepository.existsByIdBoardIdAndIdUserId(boardId, userId)) {
            throw new NotAMemberException("User is not a member of board: " + boardId);
        }

        BoardColumnEntity column = boardColumnRepository.findByIdAndBoardId(request.columnId(), boardId)
                .orElseThrow(() -> new ColumnNotFoundException("Column " + request.columnId() + " not found on board " + boardId));

        int position = taskOrderingService.calculateAppendPosition(column.getId());
        Instant now = clock.instant();

        Instant startedAt = column.getKind() == ColumnKind.IN_PROGRESS ? now : null;
        Instant completedAt = column.getKind() == ColumnKind.DONE ? now : null;

        Priority priority = request.priority() != null ? request.priority() : Priority.MEDIUM;

        if (request.suggestionId() != null) {
            estimateSuggestionRepository.findById(request.suggestionId()).ifPresent(suggestion -> {
                boolean matchesEstimate = request.estimateHours() != null
                        && suggestion.getSuggestedHours().compareTo(request.estimateHours()) == 0;
                boolean matchesPriority = suggestion.getSuggestedPriority().equalsIgnoreCase(priority.name());

                if (matchesEstimate && matchesPriority) {
                    suggestion.setOutcome(EstimateSuggestionOutcome.ACCEPTED);
                } else {
                    suggestion.setOutcome(EstimateSuggestionOutcome.EDITED);
                }
            });
        }

        TaskEntity task = new TaskEntity(
                boardId,
                column.getId(),
                request.title().trim(),
                request.description(),
                position,
                null,
                request.estimateHours(),
                priority,
                request.rationale(),
                userId,
                now,
                now,
                startedAt,
                completedAt
        );

        task = taskRepository.save(task);

        TaskResponse response = TaskMapper.toResponse(task);
        eventPublisher.publishEvent(new TaskCreatedDomainEvent(boardId, userId, now, response));

        return response;
    }

    @Transactional
    public TaskResponse patchTask(Long taskId, TaskPatchValues patch, Long userId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + taskId));

        if (!boardMemberRepository.existsByIdBoardIdAndIdUserId(task.getBoardId(), userId)) {
            throw new NotAMemberException("User is not a member of board: " + task.getBoardId());
        }

        if (!task.getVersion().equals(patch.version())) {
            throw new TaskVersionConflictException(TaskMapper.toResponse(task));
        }

        if (patch.hasTitle()) {
            task.setTitle(patch.title().trim());
        }

        if (patch.hasDescription()) {
            task.setDescription(patch.description());
        }

        if (patch.hasEstimateHours()) {
            task.setEstimateHours(patch.estimateHours());
        }

        if (patch.hasPriority()) {
            task.setPriority(patch.priority());
        }

        if (patch.hasAssigneeId()) {
            Long assigneeId = patch.assigneeId();
            if (assigneeId != null && !userRepository.existsById(assigneeId)) {
                throw new JsonPatchValidationException(List.of(
                        new FieldErrorDetail("assigneeId", "User does not exist: " + assigneeId)
                ));
            }
            task.setAssigneeId(assigneeId);
        }

        boolean moved = false;
        boolean rebalanced = false;

        if (patch.hasMove()) {
            TaskMoveValues move = patch.move();
            BoardColumnEntity targetColumn = boardColumnRepository.findByIdAndBoardId(move.columnId(), task.getBoardId())
                    .orElseThrow(() -> new ColumnNotFoundException("Target column not found on board: " + move.columnId()));

            if (move.afterTaskId() != null && move.afterTaskId().equals(taskId)) {
                throw new JsonPatchValidationException(List.of(
                        new FieldErrorDetail("move.afterTaskId", "afterTaskId cannot be the task itself")
                ));
            }

            TaskOrderingService.MovePositionResult posResult;
            try {
                posResult = taskOrderingService.calculateMovePosition(targetColumn.getId(), move.afterTaskId(), taskId);
            } catch (IllegalArgumentException ex) {
                throw new JsonPatchValidationException(List.of(
                        new FieldErrorDetail("move.afterTaskId", ex.getMessage())
                ));
            }

            task.setPosition(posResult.position());
            rebalanced = posResult.rebalanced();
            moved = true;

            BoardColumnEntity currentColumn = boardColumnRepository.findById(task.getColumnId()).orElse(null);
            ColumnKind currentKind = currentColumn != null ? currentColumn.getKind() : null;
            ColumnKind targetKind = targetColumn.getKind();
            Instant now = clock.instant();

            if (targetKind == ColumnKind.IN_PROGRESS && task.getStartedAt() == null) {
                task.setStartedAt(now);
            }
            if (targetKind == ColumnKind.DONE) {
                task.setCompletedAt(now);
            }
            if (currentKind == ColumnKind.DONE && targetKind != ColumnKind.DONE) {
                task.setCompletedAt(null);
            }

            task.setColumnId(targetColumn.getId());
        }

        Instant now = clock.instant();
        task.setUpdatedAt(now);

        task = taskRepository.saveAndFlush(task);

        TaskResponse response = TaskMapper.toResponse(task);

        if (rebalanced) {
            eventPublisher.publishEvent(new BoardResyncDomainEvent(task.getBoardId(), userId, now));
        }

        if (moved) {
            eventPublisher.publishEvent(new TaskMovedDomainEvent(task.getBoardId(), userId, now, response));
        } else {
            eventPublisher.publishEvent(new TaskUpdatedDomainEvent(task.getBoardId(), userId, now, response));
        }

        return response;
    }

    @Transactional
    public void deleteTask(Long taskId, Long version, Long userId) {
        if (version == null) {
            throw new JsonPatchValidationException(List.of(
                    new FieldErrorDetail("version", "version parameter is required")
            ));
        }

        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new TaskNotFoundException("Task not found: " + taskId));

        if (!boardMemberRepository.existsByIdBoardIdAndIdUserId(task.getBoardId(), userId)) {
            throw new NotAMemberException("User is not a member of board: " + task.getBoardId());
        }

        if (!task.getVersion().equals(version)) {
            throw new TaskVersionConflictException(TaskMapper.toResponse(task));
        }

        taskRepository.delete(task);
        taskRepository.flush();

        Instant now = clock.instant();
        eventPublisher.publishEvent(new TaskDeletedDomainEvent(task.getBoardId(), userId, now, taskId));
    }
}
