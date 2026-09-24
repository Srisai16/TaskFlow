package com.taskflow.repository;

import com.taskflow.entity.Notification;
import com.taskflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    long countByUserAndReadFlagFalse(User user);
}