package com.atlas.board.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.Objects;

@Entity
@Table(name = "board_members")
public class BoardMemberEntity {

    @EmbeddedId
    private BoardMemberId id;

    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 10)
    private Role role;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    protected BoardMemberEntity() {
        // JPA constructor
    }

    public BoardMemberEntity(Long boardId, Long userId, Role role, Instant joinedAt) {
        this.id = new BoardMemberId(boardId, userId);
        this.role = role;
        this.joinedAt = joinedAt;
    }

    public BoardMemberId getId() {
        return id;
    }

    public void setId(BoardMemberId id) {
        this.id = id;
    }

    public Role getRole() {
        return role;
    }

    public void setRole(Role role) {
        this.role = role;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BoardMemberEntity that = (BoardMemberEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
