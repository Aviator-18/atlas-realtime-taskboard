package com.atlas.board.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class BoardMemberId implements Serializable {

    @Column(name = "board_id")
    private Long boardId;

    @Column(name = "user_id")
    private Long userId;

    public BoardMemberId() {
    }

    public BoardMemberId(Long boardId, Long userId) {
        this.boardId = boardId;
        this.userId = userId;
    }

    public Long getBoardId() {
        return boardId;
    }

    public void setBoardId(Long boardId) {
        this.boardId = boardId;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BoardMemberId that = (BoardMemberId) o;
        return Objects.equals(boardId, that.boardId) && Objects.equals(userId, that.userId);
    }

    @Override
    public int hashCode() {
        return Objects.hash(boardId, userId);
    }
}
