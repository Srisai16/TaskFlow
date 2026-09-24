package com.taskflow.controller;

import com.taskflow.dto.TaskDtos;
import com.taskflow.entity.TaskPriority;
import com.taskflow.entity.TaskStatus;
import com.taskflow.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects/{projectId}/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping
    public ResponseEntity<List<TaskDtos.TaskResponse>> list(
            @PathVariable Long projectId,
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) TaskPriority priority,
            @RequestParam(required = false) Long assigneeId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String sortBy) {
        return ResponseEntity.ok(taskService.listTasks(projectId, status, priority, assigneeId, q, sortBy));
    }

    @GetMapping("/next-due")
    public ResponseEntity<List<TaskDtos.TaskResponse>> nextDue(
            @PathVariable Long projectId,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(taskService.getNextDueTasks(projectId, limit));
    }

    @PostMapping
    public ResponseEntity<TaskDtos.TaskResponse> create(
            @PathVariable Long projectId, @Valid @RequestBody TaskDtos.TaskRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(taskService.createTask(projectId, request));
    }

    @PutMapping("/{taskId}")
    public ResponseEntity<TaskDtos.TaskResponse> update(
            @PathVariable Long projectId, @PathVariable Long taskId,
            @Valid @RequestBody TaskDtos.TaskRequest request) {
        return ResponseEntity.ok(taskService.updateTask(projectId, taskId, request));
    }

    @PatchMapping("/{taskId}/status")
    public ResponseEntity<TaskDtos.TaskResponse> changeStatus(
            @PathVariable Long projectId, @PathVariable Long taskId,
            @RequestBody StatusUpdateRequest status) {
        return ResponseEntity.ok(taskService.changeStatus(projectId, taskId, status.status()));
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> delete(@PathVariable Long projectId, @PathVariable Long taskId) {
        taskService.deleteTask(projectId, taskId);
        return ResponseEntity.noContent().build();
    }

    public record StatusUpdateRequest(TaskStatus status) {
    }
}