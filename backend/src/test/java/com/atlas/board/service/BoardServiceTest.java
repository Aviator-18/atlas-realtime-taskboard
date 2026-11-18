package com.atlas.board.service;

import com.atlas.auth.persistence.UserEntity;
import com.atlas.auth.persistence.UserRepository;
import com.atlas.board.persistence.BoardColumnEntity;
import com.atlas.board.persistence.BoardColumnRepository;
import com.atlas.board.persistence.BoardEntity;
import com.atlas.board.persistence.BoardMemberEntity;
import com.atlas.board.persistence.BoardMemberId;
import com.atlas.board.persistence.BoardMemberRepository;
import com.atlas.board.persistence.BoardRepository;
import com.atlas.board.persistence.ColumnKind;
import com.atlas.board.persistence.Role;
import com.atlas.board.web.BoardDetailResponse;
import com.atlas.board.web.BoardSummaryResponse;
import com.atlas.board.web.RegenerateInviteResponse;
import com.atlas.common.NotAMemberException;
import com.atlas.task.persistence.Priority;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.access.AccessDeniedException;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class BoardServiceTest {

    private BoardRepository boardRepository;
    private BoardMemberRepository boardMemberRepository;
    private BoardColumnRepository boardColumnRepository;
    private TaskRepository taskRepository;
    private UserRepository userRepository;
    private InviteCodeGenerator inviteCodeGenerator;
    private Clock clock;
    private ApplicationEventPublisher eventPublisher;
    private BoardService boardService;

    private final Instant fixedNow = Instant.parse("2026-11-09T08:00:00Z");

    @BeforeEach
    void setUp() {
        boardRepository = Mockito.mock(BoardRepository.class);
        boardMemberRepository = Mockito.mock(BoardMemberRepository.class);
        boardColumnRepository = Mockito.mock(BoardColumnRepository.class);
        taskRepository = Mockito.mock(TaskRepository.class);
        userRepository = Mockito.mock(UserRepository.class);
        inviteCodeGenerator = Mockito.mock(InviteCodeGenerator.class);
        clock = Clock.fixed(fixedNow, ZoneOffset.UTC);
        eventPublisher = Mockito.mock(ApplicationEventPublisher.class);

        boardService = new BoardService(
                boardRepository,
                boardMemberRepository,
                boardColumnRepository,
                taskRepository,
                userRepository,
                inviteCodeGenerator,
                clock,
                eventPublisher
        );
    }

    @Test
    void creates_board_with_three_default_columns_and_owner_membership() {
        when(inviteCodeGenerator.generate()).thenReturn("K7M2QX9R");
        when(boardRepository.existsByInviteCode("K7M2QX9R")).thenReturn(false);

        when(boardRepository.save(any(BoardEntity.class))).thenAnswer(inv -> {
            BoardEntity b = inv.getArgument(0);
            var idField = BoardEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(b, 1L);
            return b;
        });

        BoardSummaryResponse response = boardService.createBoard("Sprint 12", 42L);

        assertThat(response.id()).isEqualTo(1L);
        assertThat(response.name()).isEqualTo("Sprint 12");
        assertThat(response.role()).isEqualTo("OWNER");
        assertThat(response.memberCount()).isEqualTo(1);
        assertThat(response.inviteCode()).isEqualTo("K7M2QX9R");

        ArgumentCaptor<BoardMemberEntity> memberCaptor = ArgumentCaptor.forClass(BoardMemberEntity.class);
        verify(boardMemberRepository).save(memberCaptor.capture());
        assertThat(memberCaptor.getValue().getId().getBoardId()).isEqualTo(1L);
        assertThat(memberCaptor.getValue().getId().getUserId()).isEqualTo(42L);
        assertThat(memberCaptor.getValue().getRole()).isEqualTo(Role.OWNER);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<BoardColumnEntity>> colsCaptor = ArgumentCaptor.forClass(List.class);
        verify(boardColumnRepository).saveAll(colsCaptor.capture());
        List<BoardColumnEntity> columns = colsCaptor.getValue();
        assertThat(columns).hasSize(3);
        assertThat(columns.get(0).getName()).isEqualTo("To do");
        assertThat(columns.get(0).getKind()).isEqualTo(ColumnKind.TODO);
        assertThat(columns.get(0).getPosition()).isEqualTo(1024);
        assertThat(columns.get(1).getName()).isEqualTo("In progress");
        assertThat(columns.get(1).getKind()).isEqualTo(ColumnKind.IN_PROGRESS);
        assertThat(columns.get(1).getPosition()).isEqualTo(2048);
        assertThat(columns.get(2).getName()).isEqualTo("Done");
        assertThat(columns.get(2).getKind()).isEqualTo(ColumnKind.DONE);
        assertThat(columns.get(2).getPosition()).isEqualTo(3072);
    }

    @Test
    void join_board_is_idempotent() {
        BoardEntity board = new BoardEntity("Sprint 12", "K7M2QX9R", 1L, fixedNow);
        try {
            var idField = BoardEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(board, 10L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(boardRepository.findByInviteCode("K7M2QX9R")).thenReturn(Optional.of(board));
        when(boardMemberRepository.countByIdBoardId(10L)).thenReturn(2L);

        BoardMemberEntity existingMember = new BoardMemberEntity(10L, 5L, Role.MEMBER, fixedNow);
        when(boardMemberRepository.findById(new BoardMemberId(10L, 5L))).thenReturn(Optional.of(existingMember));

        BoardSummaryResponse response = boardService.joinBoard("K7M2QX9R", 5L);

        assertThat(response.id()).isEqualTo(10L);
        assertThat(response.role()).isEqualTo("MEMBER");
        assertThat(response.memberCount()).isEqualTo(2);
    }

    @Test
    void rejects_unknown_invite_code() {
        when(boardRepository.findByInviteCode("BADCODE1")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> boardService.joinBoard("BADCODE1", 5L))
                .isInstanceOf(InvalidInviteCodeException.class);
    }

    @Test
    void rejects_non_member_viewing_board() {
        BoardEntity board = new BoardEntity("Sprint 12", "K7M2QX9R", 1L, fixedNow);
        try {
            var idField = BoardEntity.class.getDeclaredField("id");
            idField.setAccessible(true);
            idField.set(board, 10L);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }

        when(boardRepository.findById(10L)).thenReturn(Optional.of(board));
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(10L, 99L)).thenReturn(false);

        assertThatThrownBy(() -> boardService.getBoardDetail(10L, 99L))
                .isInstanceOf(NotAMemberException.class);
    }

    @Test
    void removes_member_and_unassigns_tasks_when_called_by_owner() throws Exception {
        BoardEntity board = new BoardEntity("Sprint 12", "K7M2QX9R", 1L, fixedNow, fixedNow.plus(Duration.ofDays(7)));
        setBoardId(board, 10L);

        when(boardRepository.findById(10L)).thenReturn(Optional.of(board));
        when(boardMemberRepository.existsById(new BoardMemberId(10L, 2L))).thenReturn(true);

        TaskEntity assignedTask = new TaskEntity(10L, 100L, "Fix bug", "", 1024, 2L, null, Priority.MEDIUM, null, 1L, fixedNow, fixedNow, null, null);
        when(taskRepository.findByBoardId(10L)).thenReturn(List.of(assignedTask));

        boardService.removeMember(10L, 2L, 1L);

        assertThat(assignedTask.getAssigneeId()).isNull();
        verify(taskRepository).saveAll(List.of(assignedTask));
        verify(boardMemberRepository).deleteById(new BoardMemberId(10L, 2L));
    }

    @Test
    void rejects_removing_member_when_caller_is_not_owner() throws Exception {
        BoardEntity board = new BoardEntity("Sprint 12", "K7M2QX9R", 1L, fixedNow, fixedNow.plus(Duration.ofDays(7)));
        setBoardId(board, 10L);

        when(boardRepository.findById(10L)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> boardService.removeMember(10L, 3L, 2L))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void rejects_removing_owner_from_board() throws Exception {
        BoardEntity board = new BoardEntity("Sprint 12", "K7M2QX9R", 1L, fixedNow, fixedNow.plus(Duration.ofDays(7)));
        setBoardId(board, 10L);

        when(boardRepository.findById(10L)).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> boardService.removeMember(10L, 1L, 1L))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void regenerates_invite_code_and_resets_expiry_by_seven_days() throws Exception {
        BoardEntity board = new BoardEntity("Sprint 12", "OLDCODE1", 1L, fixedNow, fixedNow.minus(Duration.ofDays(1)));
        setBoardId(board, 10L);

        when(boardRepository.findById(10L)).thenReturn(Optional.of(board));
        when(inviteCodeGenerator.generate()).thenReturn("NEWCODE2");
        when(boardRepository.existsByInviteCode("NEWCODE2")).thenReturn(false);

        RegenerateInviteResponse response = boardService.regenerateInviteCode(10L, 1L);

        assertThat(response.inviteCode()).isEqualTo("NEWCODE2");
        assertThat(response.inviteCodeExpiresAt()).isEqualTo(fixedNow.plus(Duration.ofDays(7)));
        assertThat(board.getInviteCode()).isEqualTo("NEWCODE2");
        verify(boardRepository).save(board);
    }

    @Test
    void rejects_join_board_when_invite_code_is_expired() {
        BoardEntity board = new BoardEntity("Sprint 12", "EXPIRED1", 1L, fixedNow.minus(Duration.ofDays(10)), fixedNow.minus(Duration.ofDays(3)));

        when(boardRepository.findByInviteCode("EXPIRED1")).thenReturn(Optional.of(board));

        assertThatThrownBy(() -> boardService.joinBoard("EXPIRED1", 5L))
                .isInstanceOf(InvalidInviteCodeException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void auto_rotates_expired_invite_code_when_owner_views_board() throws Exception {
        BoardEntity board = new BoardEntity("Sprint 12", "OLDEXPR1", 1L, fixedNow.minus(Duration.ofDays(10)), fixedNow.minus(Duration.ofDays(1)));
        setBoardId(board, 10L);

        when(boardRepository.findById(10L)).thenReturn(Optional.of(board));
        when(boardMemberRepository.existsByIdBoardIdAndIdUserId(10L, 1L)).thenReturn(true);
        when(inviteCodeGenerator.generate()).thenReturn("AUTOROT1");
        when(boardRepository.existsByInviteCode("AUTOROT1")).thenReturn(false);
        when(boardRepository.save(any(BoardEntity.class))).thenAnswer(inv -> inv.getArgument(0));

        BoardDetailResponse detail = boardService.getBoardDetail(10L, 1L);

        assertThat(detail.inviteCode()).isEqualTo("AUTOROT1");
        assertThat(detail.inviteCodeExpiresAt()).isEqualTo(fixedNow.plus(Duration.ofDays(7)));
    }

    private void setBoardId(BoardEntity board, Long id) throws Exception {
        var idField = BoardEntity.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(board, id);
    }
}
