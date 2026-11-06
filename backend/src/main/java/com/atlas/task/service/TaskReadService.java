package com.atlas.task.service;

import com.atlas.task.persistence.TaskEntity;
import com.atlas.task.persistence.TaskRepository;
import com.atlas.task.web.TaskResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class TaskReadService {

    private final TaskRepository taskRepository;

    public TaskReadService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, readOnly = true)
    public Optional<TaskResponse> getCurrentTaskById(Long taskId) {
        return taskRepository.findById(taskId).map(TaskMapper::toResponse);
    }
}
