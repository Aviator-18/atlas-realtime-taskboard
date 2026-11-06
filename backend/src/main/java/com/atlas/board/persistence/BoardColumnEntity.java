package com.atlas.board.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.Objects;

@Entity
@Table(name = "board_columns")
public class BoardColumnEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "board_id", nullable = false)
    private Long boardId;

    @Column(name = "name", nullable = false, length = 60)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 12)
    private ColumnKind kind;

    @Column(name = "position", nullable = false)
    private Integer position;

    protected BoardColumnEntity() {
        // JPA constructor
    }

    public BoardColumnEntity(Long boardId, String name, ColumnKind kind, Integer position) {
        this.boardId = boardId;
        this.name = name;
        this.kind = kind;
        this.position = position;
    }

    public Long getId() {
        return id;
    }

    public Long getBoardId() {
        return boardId;
    }

    public void setBoardId(Long boardId) {
        this.boardId = boardId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public ColumnKind getKind() {
        return kind;
    }

    public void setKind(ColumnKind kind) {
        this.kind = kind;
    }

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        BoardColumnEntity that = (BoardColumnEntity) o;
        return Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(id);
    }
}
