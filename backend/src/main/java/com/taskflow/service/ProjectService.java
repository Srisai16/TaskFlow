package com.taskflow.service;

import com.taskflow.dto.ProjectDtos;
import com.taskflow.entity.Project;
import com.taskflow.entity.Role;
import com.taskflow.entity.TaskStatus;
import com.taskflow.entity.User;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import com.taskflow.security.SecurityUtil;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;

    public ProjectService(ProjectRepository projectRepository,
                          TaskRepository taskRepository,
                          UserRepository userRepository,
                          SecurityUtil securityUtil) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.securityUtil = securityUtil;
    }

    @Transactional(readOnly = true)
    public List<ProjectDtos.ProjectResponse> listMyProjects() {
        User me = securityUtil.getCurrentUser();
        return projectRepository.findAllForMember(me).stream()
                .map(p -> toResponse(p, me))
                .toList();
    }

    @Transactional(readOnly = true)
    public ProjectDtos.ProjectDetailResponse getProject(Long id) {
        User me = securityUtil.getCurrentUser();
        Project project = findProject(id);
        requireAccess(project, me);
        List<ProjectDtos.MemberResponse> members = project.getMembers().stream()
                .map(m -> new ProjectDtos.MemberResponse(m.getId(), m.getName(), m.getEmail(), m.getRole()))
                .toList();
        return new ProjectDtos.ProjectDetailResponse(toResponse(project, me), members);
    }

    @Transactional
    public ProjectDtos.ProjectResponse createProject(ProjectDtos.ProjectRequest request) {
        User me = securityUtil.getCurrentUser();
        Project project = new Project(request.name().trim(), request.description(), me);
        projectRepository.save(project);
        return toResponse(project, me);
    }

    @Transactional
    public ProjectDtos.ProjectResponse updateProject(Long id, ProjectDtos.ProjectRequest request) {
        Project project = findProject(id);
        requireAdmin(project);
        project.setName(request.name().trim());
        project.setDescription(request.description());
        project.setUpdatedAt(LocalDateTime.now());
        project = projectRepository.save(project);
        return toResponse(project, securityUtil.getCurrentUser());
    }

    @Transactional
    public void deleteProject(Long id) {
        Project project = findProject(id);
        requireAdmin(project);
        projectRepository.delete(project);
    }

    @Transactional
    public ProjectDtos.MemberResponse addMember(Long id, ProjectDtos.AddMemberRequest request) {
        Project project = findProject(id);
        requireAdmin(project);

        User user = userRepository.findByEmail(request.email().trim().toLowerCase())
                .orElseThrow(() -> new BadRequestException("No user found with email: " + request.email()));

        boolean alreadyMember = project.getMembers().stream()
                .anyMatch(m -> m.getId().equals(user.getId()));
        if (alreadyMember) {
            throw new BadRequestException("User is already a member of this project");
        }

        project.getMembers().add(user);
        project.setUpdatedAt(LocalDateTime.now());
        projectRepository.save(project);
        return new ProjectDtos.MemberResponse(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }

    @Transactional
    public void removeMember(Long projectId, Long userId) {
        Project project = findProject(projectId);
        requireAdmin(project);

        User me = securityUtil.getCurrentUser();
        if (me.getId().equals(userId) && me.getRole() != com.taskflow.entity.Role.ADMIN) {
            // Let a creator leave, but never remove the last remaining member in a way that orphans the project
            throw new BadRequestException("Cannot remove yourself from a project you created");
        }

        boolean removed = project.getMembers().removeIf(m -> m.getId().equals(userId));
        if (!removed) {
            throw new ResourceNotFoundException("User is not a member of this project");
        }
        project.setUpdatedAt(LocalDateTime.now());
        projectRepository.save(project);
    }

    public Project findProject(Long id) {
        return projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
    }

    private ProjectDtos.ProjectResponse toResponse(Project p, User me) {
        return ProjectDtos.ProjectResponse.from(p,
                p.getCreatedBy().getId().equals(me.getId()),
                taskRepository.countByProject(p),
                taskRepository.countByProjectAndStatus(p, TaskStatus.DONE));
    }

    public void requireAccess(Project project, User user) {
        boolean isMember = project.getMembers().stream()
                .anyMatch(m -> m.getId().equals(user.getId()));
        if (!isMember && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("You are not a member of this project");
        }
    }

    public void requireAdmin(Project project) {
        User user = securityUtil.getCurrentUser();
        boolean isCreator = project.getCreatedBy().getId().equals(user.getId());
        if (!isCreator && user.getRole() != Role.ADMIN) {
            throw new AccessDeniedException("Only the project creator or an admin can do this");
        }
    }
}