package com.taskflow.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.taskflow.dto.NotificationResponse;
import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.NotificationRepository;
import com.taskflow.websocket.NotificationWsHandler;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationWsHandler wsHandler;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRepository notificationRepository,
                               NotificationWsHandler wsHandler,
                               ObjectMapper objectMapper) {
        this.notificationRepository = notificationRepository;
        this.wsHandler = wsHandler;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public void notify(User user, String message, String projectName) {
        Notification notification = new Notification(user, message, projectName);
        notificationRepository.save(notification);
        try {
            String payload = objectMapper.writeValueAsString(
                    Map.of("type", "NOTIFICATION", "data", NotificationResponse.from(notification)));
            wsHandler.broadcastToUser(user.getId(), payload);
        } catch (Exception ex) {
            // broadcast is best-effort; the record is already persisted
        }
    }

    public List<NotificationResponse> getForUser(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .limit(50)
                .map(NotificationResponse::from)
                .toList();
    }

    public long unreadCount(User user) {
        return notificationRepository.countByUserAndReadFlagFalse(user);
    }

    @Transactional
    public NotificationResponse markRead(User user, Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found"));
        if (!notification.getUser().getId().equals(user.getId())) {
            throw new com.taskflow.exception.BadRequestException("Cannot read another user's notification");
        }
        notification.setReadFlag(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }
}