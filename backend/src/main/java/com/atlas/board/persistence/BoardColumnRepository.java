package com.atlas.board.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardColumnRepository extends JpaRepository<BoardColumnEntity, Long> {

    List<BoardColumnEntity> findByBoardIdOrderByPositionAsc(Long boardId);

    Optional<BoardColumnEntity> findByIdAndBoardId(Long id, Long boardId);
}
