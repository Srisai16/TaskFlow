package com.taskflow.dto;

import com.taskflow.entity.Notification;

import java.time.LocalDateTime;

public record NotificationResponse(Long id, String message, String projectName,
                                   boolean isRead, LocalDateTime createdAt) {

    public static NotificationResponse from(Notification n) {
        return new NotificationResponse(n.getId(), n.getMessage(), n.getProjectName(),
                n.isReadFlag(), n.getCreatedAt());
    }
}