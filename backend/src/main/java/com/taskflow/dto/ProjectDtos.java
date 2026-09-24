package com.taskflow.dto;

import com.taskflow.entity.Project;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

public final class ProjectDtos {

    public record ProjectRequest(
            @NotBlank(message = "Project name is required")
            @Size(max = 120)
            String name,

            @Size(max = 500)
            String description) {
    }

    public record AddMemberRequest(
            @NotBlank(message = "Email is required")
            String email) {
    }

    public record ProjectResponse(Long id, String name, String description,
                                  String createdByName, long memberCount, long taskCount, long doneCount,
                                  LocalDateTime createdAt, LocalDateTime updatedAt,
                                  boolean currentUserIsCreator) {
        public static ProjectResponse from(Project p, boolean currentUserIsCreator,
                                           long taskCount, long doneCount) {
            return new ProjectResponse(
                    p.getId(), p.getName(), p.getDescription(),
                    p.getCreatedBy().getName(), p.getMembers().size(), taskCount, doneCount,
                    p.getCreatedAt(), p.getUpdatedAt(), currentUserIsCreator);
        }
    }

    public record MemberResponse(Long id, String name, String email, com.taskflow.entity.Role role) {
    }

    public record ProjectDetailResponse(ProjectResponse project, List<MemberResponse> members) {
    }
}