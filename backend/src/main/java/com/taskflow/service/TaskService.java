package com.taskflow.service;

import com.taskflow.dto.TaskDtos;
import com.taskflow.entity.Project;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskPriority;
import com.taskflow.entity.TaskStatus;
import com.taskflow.entity.User;
import com.taskflow.exception.BadRequestException;
import com.taskflow.exception.ResourceNotFoundException;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.security.SecurityUtil;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.PriorityQueue;
import java.util.function.Predicate;
import java.util.stream.Collectors;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final CommentRepository commentRepository;
    private final ProjectService projectService;
    private final SecurityUtil securityUtil;
    private final NotificationService notificationService;

    public TaskService(TaskRepository taskRepository,
                       CommentRepository commentRepository,
                       ProjectService projectService,
                       SecurityUtil securityUtil,
                       NotificationService notificationService) {
        this.taskRepository = taskRepository;
        this.commentRepository = commentRepository;
        this.projectService = projectService;
        this.securityUtil = securityUtil;
        this.notificationService = notificationService;
    }

    @Transactional(readOnly = true)
    public List<TaskDtos.TaskResponse> listTasks(Long projectId,
                                                 TaskStatus status,
                                                 TaskPriority priority,
                                                 Long assigneeId,
                                                 String q,
                                                 String sortBy) {
        Project project = projectService.findProject(projectId);
        projectService.requireAccess(project, securityUtil.getCurrentUser());

        String query = q == null ? "" : q.trim().toLowerCase();

        // Stream pipeline: any combination of zero or more filters, then a sort.
        Predicate<Task> filters = t -> (status == null || t.getStatus() == status)
                && (priority == null || t.getPriority() == priority)
                && (assigneeId == null || (t.getAssignee() != null && t.getAssignee().getId().equals(assigneeId)))
                && (query.isEmpty()
                    || t.getTitle().toLowerCase().contains(query)
                    || (t.getDescription() != null && t.getDescription().toLowerCase().contains(query)));

        Comparator<Task> comparator = switch (sortBy == null ? "position" : sortBy) {
            case "dueDate" -> Comparator
                    .comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(Task::getId);
            case "priority" -> Comparator
                    .comparingInt((Task t) -> priorityWeight(t.getPriority())).reversed()
                    .thenComparing(Task::getStatus);
            case "title" -> Comparator.comparing(Task::getTitle, String.CASE_INSENSITIVE_ORDER);
            default -> Comparator.comparingInt(Task::getPosition).thenComparing(Task::getId);
        };

        return toResponses(taskRepository.findByProject(project).stream()
                .filter(filters)
                .sorted(comparator)
                .toList());
    }

    /**
     * DSA showcase — returns the N most urgent open tasks for a project.
     * A PriorityQueue (binary heap) gives O(log n) insertion and cheap min-lookup
     * vs. a linear scan + re-sort on every request.
     */
    @Transactional(readOnly = true)
    public List<TaskDtos.TaskResponse> getNextDueTasks(Long projectId, int limit) {
        Project project = projectService.findProject(projectId);
        projectService.requireAccess(project, securityUtil.getCurrentUser());

        int cap = Math.max(1, Math.min(limit, 50));

        PriorityQueue<Task> heap = new PriorityQueue<>(nextDueComparator());
        for (Task task : taskRepository.findByProject(project)) {
            if (task.getStatus() != TaskStatus.DONE && task.getDueDate() != null) {
                heap.add(task);
                // Demonstration of heap-size bounding: keep the heap bounded to `cap`.
                if (heap.size() > cap) {
                    heap.poll();
                }
            }
        }

        List<Task> result = new ArrayList<>(cap);
        while (!heap.isEmpty()) {
            result.add(heap.poll());
        }
        // poll() returns most urgent-last; reverse to present most urgent first
        java.util.Collections.reverse(result);
        return toResponses(result);
    }

    @Transactional
    public TaskDtos.TaskResponse createTask(Long projectId, TaskDtos.TaskRequest request) {
        Project project = projectService.findProject(projectId);
        User me = securityUtil.getCurrentUser();
        projectService.requireAccess(project, me);

        Task task = new Task();
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setStatus(request.status() == null ? TaskStatus.TODO : request.status());
        task.setPriority(request.priority() == null ? TaskPriority.MEDIUM : request.priority());
        task.setDueDate(request.dueDate());
        task.setPosition(request.position() == null ? nextPosition(project) : request.position());
        task.setProject(project);
        task.setCreatedBy(me);
        if (request.assigneeId() != null) {
            task.setAssignee(resolveMember(project, request.assigneeId()));
        }

        task = taskRepository.save(task);
        project.setUpdatedAt(LocalDateTime.now());

        if (task.getAssignee() != null) {
            notificationService.notify(task.getAssignee(),
                    me.getName() + " assigned you: \"" + task.getTitle() + "\"",
                    project.getName());
        }
        return TaskDtos.TaskResponse.from(task, 0L);
    }

    @Transactional
    public TaskDtos.TaskResponse updateTask(Long projectId, Long taskId, TaskDtos.TaskRequest request) {
        Project project = projectService.findProject(projectId);
        projectService.requireAccess(project, securityUtil.getCurrentUser());

        Task task = findByProjectAndId(project, taskId);
        task.setTitle(request.title().trim());
        task.setDescription(request.description());
        task.setStatus(request.status() != null ? request.status() : task.getStatus());
        task.setPriority(request.priority() != null ? request.priority() : task.getPriority());
        task.setDueDate(request.dueDate());
        if (request.position() != null) {
            task.setPosition(request.position());
        }
        if (request.assigneeId() != null) {
            task.setAssignee(resolveMember(project, request.assigneeId()));
        }
        task.setUpdatedAt(LocalDateTime.now());
        task = taskRepository.save(task);
        project.setUpdatedAt(LocalDateTime.now());
        return toResponses(List.of(task)).get(0);
    }

    @Transactional
    public TaskDtos.TaskResponse changeStatus(Long projectId, Long taskId, TaskStatus status) {
        Project project = projectService.findProject(projectId);
        User me = securityUtil.getCurrentUser();
        projectService.requireAccess(project, me);

        Task task = findByProjectAndId(project, taskId);
        TaskStatus previous = task.getStatus();
        task.setStatus(status);
        task.setUpdatedAt(LocalDateTime.now());
        task = taskRepository.save(task);
        project.setUpdatedAt(LocalDateTime.now());

        if (task.getAssignee() != null && !task.getAssignee().getId().equals(me.getId())) {
            notificationService.notify(task.getAssignee(),
                    me.getName() + " moved \"" + task.getTitle() + "\" from " + previous + " to " + status,
                    project.getName());
        }
        return toResponses(List.of(task)).get(0);
    }

    @Transactional
    public void deleteTask(Long projectId, Long taskId) {
        Project project = projectService.findProject(projectId);
        projectService.requireAccess(project, securityUtil.getCurrentUser());
        Task task = findByProjectAndId(project, taskId);
        taskRepository.delete(task);
        project.setUpdatedAt(LocalDateTime.now());
    }

    private Task findByProjectAndId(Project project, Long taskId) {
        Task task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
        if (!task.getProject().getId().equals(project.getId())) {
            throw new BadRequestException("Task does not belong to this project");
        }
        return task;
    }

    private User resolveMember(Project project, Long userId) {
        return project.getMembers().stream()
                .filter(m -> m.getId().equals(userId))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("Assignee must be a project member"));
    }

    /**
     * Maps entities to response DTOs, attaching the comment count in ONE
     * grouped query instead of N+1 lookups.
     */
    private List<TaskDtos.TaskResponse> toResponses(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return List.of();
        }
        List<Long> ids = tasks.stream().map(Task::getId).toList();
        Map<Long, Long> counts = commentRepository.countByTaskIds(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        return tasks.stream()
                .map(t -> TaskDtos.TaskResponse.from(t, counts.getOrDefault(t.getId(), 0L)))
                .toList();
    }

    private int nextPosition(Project project) {
        return taskRepository.findByProject(project).stream()
                .mapToInt(Task::getPosition)
                .max()
                .orElse(-1) + 1;
    }

    private static int priorityWeight(TaskPriority priority) {
        return switch (priority) {
            case URGENT -> 3;
            case HIGH -> 2;
            case MEDIUM -> 1;
            case LOW -> 0;
        };
    }

    private static Comparator<Task> nextDueComparator() {
        return Comparator
                .comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparingInt(t -> priorityWeight(t.getPriority()))
                .reversed()
                .thenComparing(Task::getId, Comparator.reverseOrder());
    }
}