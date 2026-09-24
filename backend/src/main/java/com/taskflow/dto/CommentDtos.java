package com.taskflow.dto;

import com.taskflow.entity.Comment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class CommentDtos {

    public record CommentRequest(
            @NotBlank(message = "Comment cannot be empty")
            @Size(max = 2000)
            String content) {
    }

    public record CommentResponse(Long id, String content, Long taskId,
                                  Long userId, String userName, String userAvatarColor,
                                  LocalDateTime createdAt) {
        public static CommentResponse from(Comment c) {
            return new CommentResponse(c.getId(), c.getContent(), c.getTask().getId(),
                    c.getUser().getId(), c.getUser().getName(), c.getUser().getAvatarColor(),
                    c.getCreatedAt());
        }
    }
}