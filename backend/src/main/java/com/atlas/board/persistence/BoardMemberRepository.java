package com.atlas.board.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardMemberRepository extends JpaRepository<BoardMemberEntity, BoardMemberId> {

    List<BoardMemberEntity> findByIdBoardId(Long boardId);

    List<BoardMemberEntity> findByIdUserId(Long userId);

    long countByIdBoardId(Long boardId);

    boolean existsByIdBoardIdAndIdUserId(Long boardId, Long userId);
}
