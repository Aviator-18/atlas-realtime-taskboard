package com.atlas.board.service;

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
import com.atlas.board.web.BoardDetailResponse;
import com.atlas.board.web.BoardSummaryResponse;
import com.atlas.board.web.ColumnDetailResponse;
import com.atlas.board.web.MemberResponse;
import com.atlas.common.NotAMemberException;
import com.atlas.realtime.MemberJoinedDomainEvent;
import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import com.atlas.task.service.TaskMapper;
import com.atlas.task.web.TaskResponse;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class BoardService {

    private final BoardRepository boardRepository;
    private final BoardMemberRepository boardMemberRepository;
    private final BoardColumnRepository boardColumnRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final InviteCodeGenerator inviteCodeGenerator;
    private final Clock clock;
    private final ApplicationEventPublisher eventPublisher;

    public BoardService(BoardRepository boardRepository,
                        BoardMemberRepository boardMemberRepository,
                        BoardColumnRepository boardColumnRepository,
                        TaskRepository taskRepository,
                        UserRepository userRepository,
                        InviteCodeGenerator inviteCodeGenerator,
                        Clock clock,
                        ApplicationEventPublisher eventPublisher) {
        this.boardRepository = boardRepository;
        this.boardMemberRepository = boardMemberRepository;
        this.boardColumnRepository = boardColumnRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.inviteCodeGenerator = inviteCodeGenerator;
        this.clock = clock;
        this.eventPublisher = eventPublisher;
    }

    @Transactional
    public BoardSummaryResponse createBoard(String name, Long ownerUserId) {
        Instant now = clock.instant();

        String inviteCode = generateUniqueInviteCode();

        BoardEntity board = new BoardEntity(name.trim(), inviteCode, ownerUserId, now);
        board = boardRepository.save(board);

        BoardMemberEntity ownerMember = new BoardMemberEntity(board.getId(), ownerUserId, Role.OWNER, now);
        boardMemberRepository.save(ownerMember);

        BoardColumnEntity todoColumn = new BoardColumnEntity(board.getId(), "To do", ColumnKind.TODO, 1024);
        BoardColumnEntity inProgressColumn = new BoardColumnEntity(board.getId(), "In progress", ColumnKind.IN_PROGRESS, 2048);
        BoardColumnEntity doneColumn = new BoardColumnEntity(board.getId(), "Done", ColumnKind.DONE, 3072);
        boardColumnRepository.saveAll(List.of(todoColumn, inProgressColumn, doneColumn));

        return new BoardSummaryResponse(board.getId(), board.getName(), Role.OWNER.name(), 1, board.getInviteCode());
    }

    @Transactional
    public BoardSummaryResponse joinBoard(String inviteCode, Long userId) {
        BoardEntity board = boardRepository.findByInviteCode(inviteCode.trim())
                .orElseThrow(() -> new InvalidInviteCodeException("Invalid invite code: " + inviteCode));

        long memberCount = boardMemberRepository.countByIdBoardId(board.getId());
        Optional<BoardMemberEntity> existingMembership = boardMemberRepository.findById(
                new com.atlas.board.persistence.BoardMemberId(board.getId(), userId)
        );

        if (existingMembership.isPresent()) {
            return new BoardSummaryResponse(
                    board.getId(),
                    board.getName(),
                    existingMembership.get().getRole().name(),
                    memberCount,
                    board.getInviteCode()
            );
        }

        Instant now = clock.instant();
        BoardMemberEntity newMember = new BoardMemberEntity(board.getId(), userId, Role.MEMBER, now);
        boardMemberRepository.save(newMember);

        eventPublisher.publishEvent(new MemberJoinedDomainEvent(board.getId(), userId, now, userId));

        return new BoardSummaryResponse(
                board.getId(),
                board.getName(),
                Role.MEMBER.name(),
                memberCount + 1,
                board.getInviteCode()
        );
    }

    @Transactional(readOnly = true)
    public List<BoardSummaryResponse> listUserBoards(Long userId) {
        List<BoardMemberEntity> memberships = boardMemberRepository.findByIdUserId(userId);

        return memberships.stream()
                .map(membership -> {
                    BoardEntity board = boardRepository.findById(membership.getId().getBoardId())
                            .orElse(null);
                    if (board == null) {
                        return null;
                    }
                    long memberCount = boardMemberRepository.countByIdBoardId(board.getId());
                    return new BoardSummaryResponse(
                            board.getId(),
                            board.getName(),
                            membership.getRole().name(),
                            memberCount,
                            null
                    );
                })
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(BoardSummaryResponse::id))
                .toList();
    }

    @Transactional(readOnly = true)
    public BoardDetailResponse getBoardDetail(Long boardId, Long userId) {
        BoardEntity board = boardRepository.findById(boardId)
                .orElseThrow(() -> new BoardNotFoundException("Board not found: " + boardId));

        if (!boardMemberRepository.existsByIdBoardIdAndIdUserId(boardId, userId)) {
            throw new NotAMemberException("User is not a member of board: " + boardId);
        }

        List<BoardMemberEntity> memberEntities = boardMemberRepository.findByIdBoardId(boardId);
        List<Long> memberUserIds = memberEntities.stream()
                .map(m -> m.getId().getUserId())
                .toList();
        Map<Long, UserEntity> userMap = userRepository.findAllById(memberUserIds).stream()
                .collect(Collectors.toMap(UserEntity::getId, u -> u));

        List<MemberResponse> members = memberEntities.stream()
                .map(m -> {
                    UserEntity user = userMap.get(m.getId().getUserId());
                    String displayName = user != null ? user.getDisplayName() : "Unknown";
                    return new MemberResponse(m.getId().getUserId(), displayName, m.getRole().name());
                })
                .sorted(Comparator.comparing(MemberResponse::id))
                .toList();

        List<BoardColumnEntity> columnEntities = boardColumnRepository.findByBoardIdOrderByPositionAsc(boardId);
        List<TaskEntity> boardTasks = taskRepository.findByBoardId(boardId);

        Map<Long, List<TaskResponse>> tasksByColumn = boardTasks.stream()
                .sorted(Comparator.comparing(TaskEntity::getPosition))
                .map(TaskMapper::toResponse)
                .collect(Collectors.groupingBy(TaskResponse::columnId));

        List<ColumnDetailResponse> columns = columnEntities.stream()
                .map(col -> new ColumnDetailResponse(
                        col.getId(),
                        col.getName(),
                        col.getKind().name(),
                        col.getPosition(),
                        tasksByColumn.getOrDefault(col.getId(), List.of())
                ))
                .toList();

        return new BoardDetailResponse(board.getId(), board.getName(), board.getInviteCode(), members, columns);
    }

    private String generateUniqueInviteCode() {
        for (int i = 0; i < 10; i++) {
            String code = inviteCodeGenerator.generate();
            if (!boardRepository.existsByInviteCode(code)) {
                return code;
            }
        }
        throw new IllegalStateException("Failed to generate a unique board invite code");
    }
}
