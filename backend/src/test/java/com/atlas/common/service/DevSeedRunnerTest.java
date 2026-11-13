package com.atlas.common.service;

import com.atlas.auth.persistence.UserEntity;
import com.atlas.auth.persistence.UserRepository;
import com.atlas.board.persistence.BoardColumnEntity;
import com.atlas.board.persistence.BoardColumnRepository;
import com.atlas.board.persistence.BoardEntity;
import com.atlas.board.persistence.BoardMemberEntity;
import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.board.persistence.BoardRepository;
import com.atlas.board.persistence.ColumnKind;
import com.atlas.board.persistence.Role;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DevSeedRunnerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BoardRepository boardRepository;

    @Mock
    private BoardMemberRepository boardMemberRepository;

    @Mock
    private BoardColumnRepository boardColumnRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private Environment environment;

    private Clock clock;
    private DevSeedRunner runner;

    @BeforeEach
    void setUp() {
        clock = Clock.fixed(Instant.parse("2026-11-14T00:00:00Z"), ZoneOffset.UTC);
        runner = new DevSeedRunner(
                userRepository,
                boardRepository,
                boardMemberRepository,
                boardColumnRepository,
                taskRepository,
                passwordEncoder,
                clock,
                environment
        );
    }

    @Test
    @DisplayName("Refuses to run when dev profile is not active")
    void refuses_to_run_outside_dev_profile() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        assertThatThrownBy(() -> runner.run(new DefaultApplicationArguments()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("forbidden to run outside the 'dev' profile");

        verify(boardRepository, never()).save(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Skips seeding when demo data is already present")
    void skips_when_already_seeded() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        when(boardRepository.findByInviteCode(DevSeedRunner.INVITE_CODE))
                .thenReturn(Optional.of(new BoardEntity(DevSeedRunner.BOARD_NAME, DevSeedRunner.INVITE_CODE, 1L, clock.instant())));

        runner.run(new DefaultApplicationArguments());

        verify(userRepository, never()).save(any());
        verify(taskRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Seeds users, board, columns, and 14 tasks on first dev run")
    void seeds_full_demo_dataset() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});
        when(boardRepository.findByInviteCode(DevSeedRunner.INVITE_CODE)).thenReturn(Optional.empty());
        when(userRepository.existsByEmailIgnoreCase("priya@example.test")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-password");

        UserEntity user1 = new UserEntity("Priya Nair", "priya@example.test", "hashed-password", clock.instant());
        UserEntity user2 = new UserEntity("Arjun Mehta", "arjun@example.test", "hashed-password", clock.instant());
        UserEntity user3 = new UserEntity("Sana Qureshi", "sana@example.test", "hashed-password", clock.instant());

        when(userRepository.save(any(UserEntity.class))).thenReturn(user1, user2, user3);

        BoardEntity board = new BoardEntity(DevSeedRunner.BOARD_NAME, DevSeedRunner.INVITE_CODE, 1L, clock.instant());
        when(boardRepository.save(any(BoardEntity.class))).thenReturn(board);

        BoardColumnEntity todoCol = new BoardColumnEntity(1L, "To do", ColumnKind.TODO, 1024);
        BoardColumnEntity inProgressCol = new BoardColumnEntity(1L, "In progress", ColumnKind.IN_PROGRESS, 2048);
        BoardColumnEntity doneCol = new BoardColumnEntity(1L, "Done", ColumnKind.DONE, 3072);

        when(boardColumnRepository.save(any(BoardColumnEntity.class)))
                .thenReturn(todoCol, inProgressCol, doneCol);

        runner.run(new DefaultApplicationArguments());

        // Verify users created (3 users)
        verify(userRepository, org.mockito.Mockito.times(3)).save(any(UserEntity.class));

        // Verify board created
        verify(boardRepository).save(any(BoardEntity.class));

        // Verify board members created (3 members)
        verify(boardMemberRepository, org.mockito.Mockito.times(3)).save(any(BoardMemberEntity.class));

        // Verify tasks saved (14 tasks total)
        @SuppressWarnings("unchecked")
        org.mockito.ArgumentCaptor<List<TaskEntity>> tasksCaptor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(taskRepository).saveAll(tasksCaptor.capture());

        List<TaskEntity> capturedTasks = tasksCaptor.getValue();
        assertThat(capturedTasks).hasSize(14);

        long completedCount = capturedTasks.stream().filter(t -> t.getCompletedAt() != null).count();
        assertThat(completedCount).isEqualTo(6);

        long inProgressCount = capturedTasks.stream().filter(t -> t.getStartedAt() != null && t.getCompletedAt() == null).count();
        assertThat(inProgressCount).isEqualTo(4);

        long todoCount = capturedTasks.stream().filter(t -> t.getStartedAt() == null && t.getCompletedAt() == null).count();
        assertThat(todoCount).isEqualTo(4);
    }
}
