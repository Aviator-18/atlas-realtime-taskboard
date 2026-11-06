package com.atlas.board.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BoardRepository extends JpaRepository<BoardEntity, Long> {

    Optional<BoardEntity> findByInviteCode(String inviteCode);

    boolean existsByInviteCode(String inviteCode);
}
