package com.taskflow.dto;

import com.taskflow.entity.Task;
import com.taskflow.entity.TaskPriority;
import com.taskflow.entity.TaskStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class TaskDtos {

    public record TaskRequest(
            @NotBlank(message = "Task title is required")
            @Size(max = 150)
            String title,

            @Size(max = 2000)
            String description,

            TaskStatus status,
            TaskPriority priority,
            LocalDate dueDate,
            Long assigneeId,
            Integer position) {
    }

    public record TaskResponse(Long id, String title, String description, TaskStatus status,
                               TaskPriority priority, LocalDate dueDate, int position,
                               Long projectId, String projectName,
                               Long assigneeId, String assigneeName, String assigneeAvatarColor,
                               Long createdById, String createdByName,
                               LocalDateTime createdAt, LocalDateTime updatedAt,
                               boolean overdue, long commentCount) {
        public static TaskResponse from(Task t, long commentCount) {
            boolean overdue = t.getDueDate() != null
                    && t.getDueDate().isBefore(LocalDate.now())
                    && t.getStatus() != TaskStatus.DONE;
            return new TaskResponse(
                    t.getId(), t.getTitle(), t.getDescription(), t.getStatus(),
                    t.getPriority(), t.getDueDate(), t.getPosition(),
                    t.getProject().getId(), t.getProject().getName(),
                    t.getAssignee() != null ? t.getAssignee().getId() : null,
                    t.getAssignee() != null ? t.getAssignee().getName() : null,
                    t.getAssignee() != null ? t.getAssignee().getAvatarColor() : null,
                    t.getCreatedBy().getId(), t.getCreatedBy().getName(),
                    t.getCreatedAt(), t.getUpdatedAt(), overdue, commentCount);
        }
    }
}