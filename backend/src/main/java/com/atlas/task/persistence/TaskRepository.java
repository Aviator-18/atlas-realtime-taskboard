package com.atlas.task.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TaskRepository extends JpaRepository<TaskEntity, Long> {

    List<TaskEntity> findByBoardId(Long boardId);

    List<TaskEntity> findByColumnIdOrderByPositionAsc(Long columnId);

    Optional<TaskEntity> findTopByColumnIdOrderByPositionDesc(Long columnId);

    List<TaskEntity> findByColumnIdAndIdNotOrderByPositionAsc(Long columnId, Long excludedTaskId);

    List<TaskEntity> findTop5ByBoardIdAndCompletedAtIsNotNullAndEstimateHoursIsNotNullOrderByCompletedAtDesc(Long boardId);

    @Modifying
    @Query("UPDATE TaskEntity t SET t.position = :position WHERE t.id = :taskId")
    int updatePositionWithoutVersionBump(@Param("taskId") Long taskId, @Param("position") Integer position);
}
