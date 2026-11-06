package com.atlas.task.service;

import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TaskOrderingService {

    public static final int POSITION_GAP = 1024;
    private final TaskRepository taskRepository;

    public TaskOrderingService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public int calculateAppendPosition(Long columnId) {
        return taskRepository.findTopByColumnIdOrderByPositionDesc(columnId)
                .map(task -> task.getPosition() + POSITION_GAP)
                .orElse(POSITION_GAP);
    }

    @Transactional
    public MovePositionResult calculateMovePosition(Long columnId, Long afterTaskId, Long movedTaskId) {
        List<TaskEntity> columnTasks = taskRepository.findByColumnIdAndIdNotOrderByPositionAsc(columnId, movedTaskId);

        if (afterTaskId == null) {
            // Move to top of column
            if (columnTasks.isEmpty()) {
                return new MovePositionResult(POSITION_GAP, false);
            }
            int topPosition = columnTasks.get(0).getPosition() - POSITION_GAP;
            return new MovePositionResult(topPosition, false);
        }

        // Find afterTask in target column
        int index = -1;
        for (int i = 0; i < columnTasks.size(); i++) {
            if (columnTasks.get(i).getId().equals(afterTaskId)) {
                index = i;
                break;
            }
        }

        if (index == -1) {
            throw new IllegalArgumentException("afterTaskId " + afterTaskId + " does not belong to column " + columnId);
        }

        TaskEntity taskX = columnTasks.get(index);

        if (index == columnTasks.size() - 1) {
            // taskX is the last task in the column
            return new MovePositionResult(taskX.getPosition() + POSITION_GAP, false);
        }

        TaskEntity taskY = columnTasks.get(index + 1);
        int gap = taskY.getPosition() - taskX.getPosition();

        if (gap < 2) {
            // Rebalance column without changing task versions
            for (int i = 0; i < columnTasks.size(); i++) {
                int newPos = (i + 1) * POSITION_GAP;
                TaskEntity task = columnTasks.get(i);
                task.setPosition(newPos);
                taskRepository.updatePositionWithoutVersionBump(task.getId(), newPos);
            }
            int rebalancedXPos = (index + 1) * POSITION_GAP;
            int rebalancedYPos = (index + 2) * POSITION_GAP;
            int midpoint = rebalancedXPos + (rebalancedYPos - rebalancedXPos) / 2;
            return new MovePositionResult(midpoint, true);
        }

        int midpoint = taskX.getPosition() + gap / 2;
        return new MovePositionResult(midpoint, false);
    }

    public record MovePositionResult(int position, boolean rebalanced) {
    }
}
