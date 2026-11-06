package com.atlas.task.service;

import com.atlas.task.web.TaskResponse;

public class TaskVersionConflictException extends RuntimeException {

    private final TaskResponse currentTask;

    public TaskVersionConflictException(TaskResponse currentTask) {
        super("Task changed since you loaded it");
        this.currentTask = currentTask;
    }

    public TaskResponse getCurrentTask() {
        return currentTask;
    }
}
