package com.atlas.board.web;

import com.atlas.board.service.BoardService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/boards")
public class BoardController {

    private final BoardService boardService;

    public BoardController(BoardService boardService) {
        this.boardService = boardService;
    }

    @GetMapping
    public List<BoardSummaryResponse> listBoards(@AuthenticationPrincipal Jwt jwt) {
        Long userId = Long.valueOf(jwt.getSubject());
        return boardService.listUserBoards(userId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BoardSummaryResponse createBoard(@AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody CreateBoardRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        return boardService.createBoard(request.name(), userId);
    }

    @PostMapping("/join")
    public BoardSummaryResponse joinBoard(@AuthenticationPrincipal Jwt jwt,
                                          @Valid @RequestBody JoinBoardRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        return boardService.joinBoard(request.inviteCode(), userId);
    }

    @GetMapping("/{boardId}")
    public BoardDetailResponse getBoard(@AuthenticationPrincipal Jwt jwt,
                                        @PathVariable("boardId") Long boardId) {
        Long userId = Long.valueOf(jwt.getSubject());
        return boardService.getBoardDetail(boardId, userId);
    }
}
