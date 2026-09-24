package com.taskflow.dto;

import com.taskflow.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class AuthDtos {

    public record RegisterRequest(
            @NotBlank(message = "Name is required")
            @Size(max = 100)
            String name,

            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Password is required")
            @Size(min = 6, message = "Password must be at least 6 characters")
            String password) {
    }

    public record LoginRequest(
            @NotBlank(message = "Email is required")
            @Email(message = "Invalid email format")
            String email,

            @NotBlank(message = "Password is required")
            String password) {
    }

    public record AuthResponse(String token, UserResponse user) {
    }

    public record UserResponse(Long id, String name, String email, Role role, String avatarColor,
                               LocalDateTime createdAt) {
        public static UserResponse from(com.taskflow.entity.User u) {
            return new UserResponse(u.getId(), u.getName(), u.getEmail(), u.getRole(),
                    u.getAvatarColor(), u.getCreatedAt());
        }
    }
}