package com.taskflow.controller;

import com.taskflow.dto.NotificationResponse;
import com.taskflow.security.SecurityUtil;
import com.taskflow.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final SecurityUtil securityUtil;

    public NotificationController(NotificationService notificationService, SecurityUtil securityUtil) {
        this.notificationService = notificationService;
        this.securityUtil = securityUtil;
    }

    @GetMapping
    public ResponseEntity<List<NotificationResponse>> list() {
        return ResponseEntity.ok(notificationService.getForUser(securityUtil.getCurrentUser()));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Long> unreadCount() {
        return ResponseEntity.ok(notificationService.unreadCount(securityUtil.getCurrentUser()));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markRead(securityUtil.getCurrentUser(), id));
    }
}