package com.atlas.task.web;

import com.atlas.task.service.TaskPatchParser;
import com.atlas.task.service.TaskService;
import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class TaskController {

    private final TaskService taskService;
    private final TaskPatchParser taskPatchParser;

    public TaskController(TaskService taskService, TaskPatchParser taskPatchParser) {
        this.taskService = taskService;
        this.taskPatchParser = taskPatchParser;
    }

    @PostMapping("/boards/{boardId}/tasks")
    @ResponseStatus(HttpStatus.CREATED)
    public TaskResponse createTask(@AuthenticationPrincipal Jwt jwt,
                                   @PathVariable("boardId") Long boardId,
                                   @Valid @RequestBody CreateTaskRequest request) {
        Long userId = Long.valueOf(jwt.getSubject());
        return taskService.createTask(boardId, request, userId);
    }

    @PatchMapping("/tasks/{taskId}")
    public TaskResponse patchTask(@AuthenticationPrincipal Jwt jwt,
                                  @PathVariable("taskId") Long taskId,
                                  @RequestBody JsonNode body) {
        Long userId = Long.valueOf(jwt.getSubject());
        TaskPatchValues patchValues = taskPatchParser.parse(body);
        return taskService.patchTask(taskId, patchValues, userId);
    }

    @DeleteMapping("/tasks/{taskId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@AuthenticationPrincipal Jwt jwt,
                           @PathVariable("taskId") Long taskId,
                           @RequestParam("version") Long version) {
        Long userId = Long.valueOf(jwt.getSubject());
        taskService.deleteTask(taskId, version, userId);
    }
}
