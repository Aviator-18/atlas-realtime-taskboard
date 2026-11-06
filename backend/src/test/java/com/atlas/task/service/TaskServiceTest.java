package com.atlas.task.service;

import com.atlas.auth.persistence.UserRepository;
import com.atlas.board.persistence.BoardColumnEntity;
import com.atlas.board.persistence.BoardColumnRepository;
import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.board.persistence.ColumnKind;
import com.atlas.common.NotAMemberException;
import com.atlas.estimation.persistence.EstimateSuggestionRepository;
import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import com.atlas.task.web.CreateTaskRequest;
import com.atlas.task.web.TaskMoveValues;
import com.atlas.task.web.TaskPatchValues;
import com.atlas.task.web.TaskResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.context.ApplicationEventPublisher;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TaskServiceTest {

    private TaskRepository taskRepository;
    private BoardColumnRepository boardColumnRepository;
    private BoardMemberRepository boardMemberRepository;
    private UserRepository userRepository;
    private EstimateSuggestionRepository estimateSuggestionRepository;
    private TaskOrderingService taskOrderingService;
    private Clock clock;
    private ApplicationEventPublisher eventPublisher;
    private TaskService taskService;

    private final Instant t1 = Instant.parse("2026-11-09T08:00:00Z");
    private final Instant t2 = Instant.parse("2026-11-09T09:00:00Z");

    @BeforeEach
    void setUp() {
        taskRepository = Mockito.mock(TaskRepository.class);
        boardColumnRepository = Mockito.mock(BoardColumnRepository.class);
        boardMemberRepository = Mockito.mock(BoardMemberRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        estimateSuggestionRepository = Mockito.mock(EstimateSuggestionRepository.class);
        taskOrderingService = Mockito.mock(TaskOrderingService.class);
        clock = Clock.fixed(t1, ZoneOffset.UTC);
        eventPublisher = Mockito.mock(ApplicationEventPublisher.class);

        taskService = new TaskService(
                taskRepository,
                boardColumnRepository,
                boardMemberRepository,
                userRepository,
                estimateSuggestionRepository,
                taskOrderingService,
                clock,
                eventPublisher
        );
    }

    private BoardColumnEntity buildColumn(Long id, Long boardId, String name, ColumnKind kind, int position) {
        BoardColumnEntity col = new BoardColumnEntity(boardId, name, kind, position);
        try {
            var idField = BoardColumnEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(col, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return col;
    }

    private TaskEntity buildTask(Long id, Long columnId, Long version, Instant startedAt, Instant completedAt) {
        TaskEntity t = new TaskEntity(
                1L,
                columnId,
                "Task " + id,
                "Description",
                1024,
                null,
                new BigDecimal("2.0"),
                Priority.MEDIUM,
                null,
                1L,
                t1,
                t1,
                startedAt,
                completedAt
        );
        try {
            var idField = TaskEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(t, id);

            var verField = TaskEntity.class.getDeclaredField("version");
            verField.setAccessible(true);
            verField.set(t, version);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return t;
    }

    @Test
    void rejects_task_creation_by_non_member() {
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 99L)).thenReturn(false);

        CreateTaskRequest req = new CreateTaskRequest(10L, "New Task", null, null, null, null, null);

        assertThatThrownBy(() -> taskService.createTask(1L, req, 99L))
                .isInstanceOf(NotAMemberException.class);
    }

    @Test
    void sets_started_at_when_created_in_in_progress_column() {
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 5L)).thenReturn(true);
        BoardColumnEntity col = buildColumn(20L, 1L, "In progress", ColumnKind.IN_PROGRESS, 2048);
        when(boardColumnRepository.findByIdAndBoardId(20L, 1L)).thenReturn(Optional.of(col));
        when(taskOrderingService.calculateAppendPosition(20L)).thenReturn(1024);

        when(taskRepository.save(any(TaskEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        CreateTaskRequest req = new CreateTaskRequest(20L, "Started Task", null, null, null, null, null);
        TaskResponse res = taskService.createTask(1L, req, 5L);

        assertThat(res.startedAt()).isEqualTo(t1);
        assertThat(res.completedAt()).isNull();
    }

    @Test
    void rejects_stale_version_on_patch_with_conflict() {
        TaskEntity task = buildTask(7L, 10L, 3L, null, null);
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 5L)).thenReturn(true);

        TaskPatchValues patch = new TaskPatchValues(
                2L, // Stale version (db has 3)
                true, "New Title",
                false, null,
                false, null,
                false, null,
                false, null,
                false, null
        );

        assertThatThrownBy(() -> taskService.patchTask(7L, patch, 5L))
                .isInstanceOf(TaskVersionConflictException.class)
                .satisfies(ex -> {
                    TaskVersionConflictException tve = (TaskVersionConflictException) ex;
                    assertThat(tve.getCurrentTask().version()).isEqualTo(3L);
                    assertThat(tve.getCurrentTask().id()).isEqualTo(7L);
                });
    }

    @Test
    void updates_timestamps_on_move_according_to_us07() {
        TaskEntity task = buildTask(7L, 10L, 1L, null, null);
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 5L)).thenReturn(true);

        BoardColumnEntity todoCol = buildColumn(10L, 1L, "To do", ColumnKind.TODO, 1024);
        BoardColumnEntity progressCol = buildColumn(20L, 1L, "In progress", ColumnKind.IN_PROGRESS, 2048);
        BoardColumnEntity doneCol = buildColumn(30L, 1L, "Done", ColumnKind.DONE, 3072);

        when(boardColumnRepository.findById(10L)).thenReturn(Optional.of(todoCol));
        when(boardColumnRepository.findByIdAndBoardId(20L, 1L)).thenReturn(Optional.of(progressCol));
        when(taskOrderingService.calculateMovePosition(20L, null, 7L))
                .thenReturn(new TaskOrderingService.MovePositionResult(1024, false));
        when(taskRepository.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));

        // 1. Move from TODO to IN_PROGRESS sets startedAt
        TaskPatchValues moveToProgress = new TaskPatchValues(
                1L, false, null, false, null, false, null, false, null, false, null,
                true, new TaskMoveValues(20L, null)
        );
        TaskResponse res1 = taskService.patchTask(7L, moveToProgress, 5L);
        assertThat(res1.startedAt()).isEqualTo(t1);
        assertThat(res1.completedAt()).isNull();

        // 2. Move from IN_PROGRESS to DONE sets completedAt
        when(boardColumnRepository.findById(20L)).thenReturn(Optional.of(progressCol));
        when(boardColumnRepository.findByIdAndBoardId(30L, 1L)).thenReturn(Optional.of(doneCol));
        when(taskOrderingService.calculateMovePosition(30L, null, 7L))
                .thenReturn(new TaskOrderingService.MovePositionResult(1024, false));

        TaskPatchValues moveToDone = new TaskPatchValues(
                1L, false, null, false, null, false, null, false, null, false, null,
                true, new TaskMoveValues(30L, null)
        );
        TaskResponse res2 = taskService.patchTask(7L, moveToDone, 5L);
        assertThat(res2.startedAt()).isEqualTo(t1);
        assertThat(res2.completedAt()).isEqualTo(t1);

        // 3. Move from DONE back to IN_PROGRESS clears completedAt
        when(boardColumnRepository.findById(30L)).thenReturn(Optional.of(doneCol));
        when(boardColumnRepository.findByIdAndBoardId(20L, 1L)).thenReturn(Optional.of(progressCol));

        TaskPatchValues moveBackToProgress = new TaskPatchValues(
                1L, false, null, false, null, false, null, false, null, false, null,
                true, new TaskMoveValues(20L, null)
        );
        TaskResponse res3 = taskService.patchTask(7L, moveBackToProgress, 5L);
        assertThat(res3.startedAt()).isEqualTo(t1);
        assertThat(res3.completedAt()).isNull();
    }

    @Test
    void rejects_stale_version_on_delete() {
        TaskEntity task = buildTask(7L, 10L, 3L, null, null);
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 5L)).thenReturn(true);

        assertThatThrownBy(() -> taskService.deleteTask(7L, 2L, 5L))
                .isInstanceOf(TaskVersionConflictException.class)
                .satisfies(ex -> {
                    TaskVersionConflictException tve = (TaskVersionConflictException) ex;
                    assertThat(tve.getCurrentTask().version()).isEqualTo(3L);
                });
    }

    @Test
    void deletes_task_when_version_matches() {
        TaskEntity task = buildTask(7L, 10L, 3L, null, null);
        when(taskRepository.findById(7L)).thenReturn(Optional.of(task));
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(1L, 5L)).thenReturn(true);

        taskService.deleteTask(7L, 3L, 5L);

        verify(taskRepository).delete(task);
        verify(taskRepository).flush();
    }
}
