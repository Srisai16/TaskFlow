package com.taskflow.service;

import com.taskflow.dto.TaskDtos;
import com.taskflow.entity.*;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.security.SecurityUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private CommentRepository commentRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private SecurityUtil securityUtil;
    @Mock
    private NotificationService notificationService;

    private TaskService service;
    private User user;
    private Project project;

    @BeforeEach
    void setUp() {
        service = new TaskService(taskRepository, commentRepository, projectService, securityUtil,
                notificationService);
        lenient().when(commentRepository.countByTaskIds(anyList())).thenReturn(List.of());
        user = new User("Test User", "test@taskflow.dev", "encoded", Role.MEMBER);
        user.setId(1L);
        project = new Project("Demo", "desc", user);
        project.setId(10L);
        project.getMembers().add(user);
    }

    private Task task(Long id, LocalDate due, TaskPriority priority, TaskStatus status, int position) {
        Task t = new Task();
        t.setId(id);
        t.setTitle("Task " + id);
        t.setDueDate(due);
        t.setPriority(priority);
        t.setStatus(status);
        t.setPosition(position);
        t.setProject(project);
        t.setCreatedBy(user);
        t.setAssignee(user);
        return t;
    }

    @Test
    @DisplayName("next-due returns open tasks ordered by nearest due date, ignoring DONE")
    void nextDue_ordersByDueDateAndSkipsDone() {
        when(projectService.findProject(10L)).thenReturn(project);
        Task later = task(3L, LocalDate.of(2026, 3, 1), TaskPriority.LOW, TaskStatus.TODO, 0);
        Task sooner = task(2L, LocalDate.of(2026, 1, 15), TaskPriority.HIGH, TaskStatus.IN_PROGRESS, 0);
        Task alreadyDone = task(1L, LocalDate.of(2025, 1, 1), TaskPriority.URGENT, TaskStatus.DONE, 0);
        when(taskRepository.findByProject(project)).thenReturn(List.of(later, sooner, alreadyDone));

        List<TaskDtos.TaskResponse> result = service.getNextDueTasks(10L, 10);

        assertThat(result).extracting(TaskDtos.TaskResponse::id).containsExactly(2L, 3L);
    }

    @Test
    @DisplayName("next-due respects a limit, keeping only the most urgent window")
    void nextDue_respectsLimit() {
        when(projectService.findProject(10L)).thenReturn(project);
        Task first = task(1L, LocalDate.of(2026, 1, 1), TaskPriority.MEDIUM, TaskStatus.TODO, 0);
        Task second = task(2L, LocalDate.of(2026, 1, 2), TaskPriority.MEDIUM, TaskStatus.TODO, 0);
        Task third = task(3L, LocalDate.of(2026, 1, 3), TaskPriority.MEDIUM, TaskStatus.TODO, 0);
        when(taskRepository.findByProject(project)).thenReturn(List.of(first, second, third));

        List<TaskDtos.TaskResponse> result = service.getNextDueTasks(10L, 2);

        assertThat(result).extracting(TaskDtos.TaskResponse::id).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("list filters by status and sorts by due date")
    void listTasks_filtersAndSorts() {
        when(projectService.findProject(10L)).thenReturn(project);
        Task oldOpen = task(1L, LocalDate.of(2026, 1, 1), TaskPriority.LOW, TaskStatus.TODO, 0);
        Task newOpen = task(2L, LocalDate.of(2026, 1, 9), TaskPriority.HIGH, TaskStatus.TODO, 0);
        Task doneTask = task(3L, LocalDate.of(2026, 1, 5), TaskPriority.HIGH, TaskStatus.DONE, 0);
        when(taskRepository.findByProject(project)).thenReturn(List.of(oldOpen, newOpen, doneTask));

        List<TaskDtos.TaskResponse> result =
                service.listTasks(10L, TaskStatus.TODO, null, null, null, "dueDate");

        assertThat(result).extracting(TaskDtos.TaskResponse::id).containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("list handles empty project gracefully")
    void listTasks_emptyProject() {
        when(projectService.findProject(10L)).thenReturn(project);
        when(taskRepository.findByProject(project)).thenReturn(List.of());

        List<TaskDtos.TaskResponse> result =
                service.listTasks(10L, null, null, null, null, "position");

        assertThat(result).isEmpty();
    }
}