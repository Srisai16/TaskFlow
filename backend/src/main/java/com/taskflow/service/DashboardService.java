package com.taskflow.service;

import com.taskflow.dto.DashboardDtos;
import com.taskflow.entity.Project;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskStatus;
import com.taskflow.repository.TaskRepository;
import com.taskflow.security.SecurityUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Aggregations computed with Java Streams + Collectors. Great source of
 * interview talking points: groupingBy, counting, toMap with merge functions,
 * and defensive division.
 */
@Service
public class DashboardService {

    private final TaskRepository taskRepository;
    private final ProjectService projectService;
    private final SecurityUtil securityUtil;

    public DashboardService(TaskRepository taskRepository,
                            ProjectService projectService,
                            SecurityUtil securityUtil) {
        this.taskRepository = taskRepository;
        this.projectService = projectService;
        this.securityUtil = securityUtil;
    }

    @Transactional(readOnly = true)
    public DashboardDtos.DashboardStats getStats(Long projectId) {
        Project project = projectService.findProject(projectId);
        projectService.requireAccess(project, securityUtil.getCurrentUser());

        List<Task> tasks = taskRepository.findByProject(project);
        long total = tasks.size();
        long done = tasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        DashboardDtos.StatusCount statuses = new DashboardDtos.StatusCount(
                countBy(tasks, TaskStatus.TODO),
                countBy(tasks, TaskStatus.IN_PROGRESS),
                countBy(tasks, TaskStatus.IN_REVIEW),
                done,
                total);

        long overdue = tasks.stream()
                .filter(t -> t.getDueDate() != null
                        && t.getDueDate().isBefore(LocalDate.now())
                        && t.getStatus() != TaskStatus.DONE)
                .count();

        double completionRate = total == 0 ? 0 : Math.round((done * 1000.0 / total)) / 10.0;

        // groupingBy produces EnumMap-backed map => deterministic ordering by enum constant
        Map<String, Long> byPriority = tasks.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getPriority().name(),
                        () -> new java.util.LinkedHashMap<>(),
                        Collectors.counting()));

        List<DashboardDtos.MemberStat> memberBreakdown = memberBreakdown(tasks, project);

        return new DashboardDtos.DashboardStats(statuses, overdue, completionRate,
                byPriority, memberBreakdown);
    }

    private long countBy(List<Task> tasks, TaskStatus status) {
        return tasks.stream().filter(t -> t.getStatus() == status).count();
    }

    private List<DashboardDtos.MemberStat> memberBreakdown(List<Task> tasks, Project project) {
        return project.getMembers().stream()
                .map(member -> {
                    long assigned = tasks.stream()
                            .filter(t -> t.getAssignee() != null
                                    && t.getAssignee().getId().equals(member.getId()))
                            .count();
                    long completed = tasks.stream()
                            .filter(t -> t.getAssignee() != null
                                    && t.getAssignee().getId().equals(member.getId())
                                    && t.getStatus() == TaskStatus.DONE)
                            .count();
                    return new DashboardDtos.MemberStat(member.getEmail(), member.getName(),
                            assigned, completed);
                })
                .filter(stat -> stat.assigned() > 0 || stat.completed() > 0)
                .sorted((a, b) -> Long.compare(b.assigned(), a.assigned()))
                .toList();
    }
}