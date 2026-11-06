package com.atlas.task.service;

import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TaskOrderingServiceTest {

    private TaskRepository taskRepository;
    private TaskOrderingService orderingService;

    @BeforeEach
    void setUp() {
        taskRepository = Mockito.mock(TaskRepository.class);
        orderingService = new TaskOrderingService(taskRepository);
    }

    private TaskEntity createTask(Long id, Long columnId, int position) {
        TaskEntity task = new TaskEntity(
                1L,
                columnId,
                "Task " + id,
                "",
                position,
                null,
                null,
                Priority.MEDIUM,
                null,
                1L,
                Instant.now(),
                Instant.now(),
                null,
                null
        );
        try {
            var idField = TaskEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(task, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return task;
    }

    @Test
    void appends_to_empty_column_with_default_spacing() {
        when(taskRepository.findTopByColumnIdOrderByPositionDesc(1L)).thenReturn(Optional.empty());

        int pos = orderingService.calculateAppendPosition(1L);

        assertThat(pos).isEqualTo(1024);
    }

    @Test
    void appends_to_non_empty_column_after_last_task() {
        TaskEntity last = createTask(5L, 1L, 2048);
        when(taskRepository.findTopByColumnIdOrderByPositionDesc(1L)).thenReturn(Optional.of(last));

        int pos = orderingService.calculateAppendPosition(1L);

        assertThat(pos).isEqualTo(3072);
    }

    @Test
    void moves_to_top_of_empty_column() {
        when(taskRepository.findByColumnIdAndIdNotOrderByPositionAsc(1L, 99L)).thenReturn(List.of());

        TaskOrderingService.MovePositionResult result = orderingService.calculateMovePosition(1L, null, 99L);

        assertThat(result.position()).isEqualTo(1024);
        assertThat(result.rebalanced()).isFalse();
    }

    @Test
    void moves_to_top_of_non_empty_column() {
        TaskEntity first = createTask(1L, 1L, 1024);
        when(taskRepository.findByColumnIdAndIdNotOrderByPositionAsc(1L, 99L)).thenReturn(List.of(first));

        TaskOrderingService.MovePositionResult result = orderingService.calculateMovePosition(1L, null, 99L);

        assertThat(result.position()).isEqualTo(0);
        assertThat(result.rebalanced()).isFalse();
    }

    @Test
    void moves_after_last_task_in_column() {
        TaskEntity first = createTask(1L, 1L, 1024);
        TaskEntity second = createTask(2L, 1L, 2048);
        when(taskRepository.findByColumnIdAndIdNotOrderByPositionAsc(1L, 99L)).thenReturn(List.of(first, second));

        TaskOrderingService.MovePositionResult result = orderingService.calculateMovePosition(1L, 2L, 99L);

        assertThat(result.position()).isEqualTo(3072);
        assertThat(result.rebalanced()).isFalse();
    }

    @Test
    void moves_between_two_tasks_with_midpoint() {
        TaskEntity first = createTask(1L, 1L, 1024);
        TaskEntity second = createTask(2L, 1L, 2048);
        when(taskRepository.findByColumnIdAndIdNotOrderByPositionAsc(1L, 99L)).thenReturn(List.of(first, second));

        TaskOrderingService.MovePositionResult result = orderingService.calculateMovePosition(1L, 1L, 99L);

        assertThat(result.position()).isEqualTo(1536);
        assertThat(result.rebalanced()).isFalse();
    }

    @Test
    void rebalances_column_when_gap_is_smaller_than_two() {
        TaskEntity first = createTask(1L, 1L, 1024);
        TaskEntity second = createTask(2L, 1L, 1025);
        List<TaskEntity> tasks = new ArrayList<>(List.of(first, second));
        when(taskRepository.findByColumnIdAndIdNotOrderByPositionAsc(1L, 99L)).thenReturn(tasks);

        TaskOrderingService.MovePositionResult result = orderingService.calculateMovePosition(1L, 1L, 99L);

        assertThat(result.rebalanced()).isTrue();
        assertThat(result.position()).isEqualTo(1536);
        verify(taskRepository).updatePositionWithoutVersionBump(1L, 1024);
        verify(taskRepository).updatePositionWithoutVersionBump(2L, 2048);
    }
}
