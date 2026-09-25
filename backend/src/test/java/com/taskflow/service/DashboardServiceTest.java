package com.taskflow.service;

import com.taskflow.dto.DashboardDtos;
import com.taskflow.entity.*;
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
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private ProjectService projectService;
    @Mock
    private SecurityUtil securityUtil;

    private DashboardService service;
    private Project project;

    @BeforeEach
    void setUp() {
        service = new DashboardService(taskRepository, projectService, securityUtil);
        User creator = new User("Owner", "owner@taskflow.dev", "x", Role.MEMBER);
        creator.setId(1L);
        project = new Project("Demo", "desc", creator);
        project.setId(10L);
        project.getMembers().add(creator);
    }

    private Task task(Long id, TaskStatus status, TaskPriority priority, LocalDate due) {
        Task t = new Task();
        t.setId(id);
        t.setTitle("Task " + id);
        t.setStatus(status);
        t.setPriority(priority);
        t.setDueDate(due);
        t.setProject(project);
        t.setCreatedBy(project.getCreatedBy());
        t.setAssignee(project.getCreatedBy());
        return t;
    }

    @Test
    @DisplayName("computes status counts, overdue and completion rate via streams")
    void stats_aggregatesCounts() {
        when(projectService.findProject(10L)).thenReturn(project);
        when(taskRepository.findByProject(project)).thenReturn(List.of(
                task(1L, TaskStatus.DONE, TaskPriority.HIGH, LocalDate.now().minusDays(2)),
                task(2L, TaskStatus.DONE, TaskPriority.LOW, LocalDate.now().minusDays(1)),
                task(3L, TaskStatus.IN_PROGRESS, TaskPriority.HIGH, LocalDate.now().plusDays(1)),
                task(4L, TaskStatus.TODO, TaskPriority.HIGH, LocalDate.now().minusDays(3)),
                task(5L, TaskStatus.IN_REVIEW, TaskPriority.MEDIUM, LocalDate.now().plusDays(2))));

        DashboardDtos.DashboardStats stats = service.getStats(10L);

        assertThat(stats.statuses().todo()).isEqualTo(1);
        assertThat(stats.statuses().inProgress()).isEqualTo(1);
        assertThat(stats.statuses().inReview()).isEqualTo(1);
        assertThat(stats.statuses().done()).isEqualTo(2);
        assertThat(stats.statuses().total()).isEqualTo(5);
        assertThat(stats.overdue()).isEqualTo(1);
        assertThat(stats.completionRate()).isEqualTo(40.0);
    }

    @Test
    @DisplayName("empty project yields zero-safe stats (no divide by zero)")
    void stats_emptyProject() {
        when(projectService.findProject(10L)).thenReturn(project);
        when(taskRepository.findByProject(project)).thenReturn(List.of());

        DashboardDtos.DashboardStats stats = service.getStats(10L);

        assertThat(stats.statuses().total()).isZero();
        assertThat(stats.completionRate()).isZero();
        assertThat(stats.tasksByPriority()).isEmpty();
    }

    @Test
    @DisplayName("priority buckets reflect actual task distribution")
    void stats_priorityBuckets() {
        when(projectService.findProject(10L)).thenReturn(project);
        when(taskRepository.findByProject(project)).thenReturn(List.of(
                task(1L, TaskStatus.TODO, TaskPriority.URGENT, LocalDate.now()),
                task(2L, TaskStatus.DONE, TaskPriority.URGENT, LocalDate.now()),
                task(3L, TaskStatus.DONE, TaskPriority.LOW, LocalDate.now())));

        DashboardDtos.DashboardStats stats = service.getStats(10L);

        assertThat(stats.tasksByPriority())
                .containsExactlyInAnyOrderEntriesOf(Map.of("URGENT", 2L, "LOW", 1L));
    }
}