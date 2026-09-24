package com.taskflow.service;

import com.taskflow.dto.CommentDtos;
import com.taskflow.entity.Comment;
import com.taskflow.entity.Project;
import com.taskflow.entity.Task;
import com.taskflow.entity.User;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.security.SecurityUtil;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CommentService {

    private final CommentRepository commentRepository;
    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final SecurityUtil securityUtil;
    private final NotificationService notificationService;

    public CommentService(CommentRepository commentRepository,
                          TaskRepository taskRepository,
                          ProjectService projectService,
                          SecurityUtil securityUtil,
                          NotificationService notificationService) {
        this.commentRepository = commentRepository;
        this.taskRepository = taskRepository;
        this.projectService = projectService;
        this.securityUtil = securityUtil;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<CommentDtos.CommentResponse> listComments(Long projectId, Long taskId) {
        Project project = projectService.findProject(projectId);
        projectService.requireAccess(project, securityUtil.getCurrentUser());
        Task task = findTaskInProject(project, taskId);
        return commentRepository.findByTaskOrderByCreatedAtAsc(task).stream()
                .map(CommentDtos.CommentResponse::from)
                .toList();
    }

    @Transactional
    public CommentDtos.CommentResponse addComment(Long projectId, Long taskId,
                                                  CommentDtos.CommentRequest request) {
        Project project = projectService.findProject(projectId);
        User me = securityUtil.getCurrentUser();
        projectService.requireAccess(project, me);

        Task task = findTaskInProject(project, taskId);
        Comment comment = commentRepository.save(new Comment(request.content().trim(), task, me));

        // Notify the assignee (if not the commenter) about the activity
        if (task.getAssignee() != null && !task.getAssignee().getId().equals(me.getId())) {
            notificationService.notify(task.getAssignee(),
                    me.getName() + " commented on \"" + task.getTitle() + "\"",
                    project.getName());
        }
        return CommentDtos.CommentResponse.from(comment);
    }

    @Transactional
    public void deleteComment(Long projectId, Long commentId) {
        Project project = projectService.findProject(projectId);
        User me = securityUtil.getCurrentUser();
        projectService.requireAccess(project, me);

        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found with id: " + commentId));

        boolean isOwner = comment.getUser().getId().equals(me.getId());
        boolean isProjectAdmin = project.getCreatedBy().getId().equals(me.getId())
                || me.getRole() == com.taskflow.entity.Role.ADMIN;
        if (!isOwner && !isProjectAdmin) {
            throw new AccessDeniedException("Only the author or a project admin can delete a comment");
        }
        commentRepository.delete(comment);
    }

    private Task findTaskInProject(Project project, Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        if (!task.getProject().getId().equals(project.getId())) {
            throw new BadRequestException("Task does not belong to this project");
        }
        return task;
    }
}