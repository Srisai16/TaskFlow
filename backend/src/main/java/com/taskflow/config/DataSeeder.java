package com.taskflow.config;

import com.taskflow.entity.*;
import com.taskflow.repository.CommentRepository;
import com.taskflow.repository.ProjectRepository;
import com.taskflow.repository.TaskRepository;
import com.taskflow.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.List;

/**
 * Seeds a demo workspace when the database is empty so the app is instantly
 * explorable. Disable with app.seed.enabled=false (recommended for prod).
 */
@Configuration
public class DataSeeder {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    @Bean
    CommandLineRunner seed(@Value("${app.seed.enabled:true}") boolean enabled,
                           UserRepository userRepository,
                           ProjectRepository projectRepository,
                           TaskRepository taskRepository,
                           CommentRepository commentRepository,
                           PasswordEncoder passwordEncoder) {
        return args -> {
            if (!enabled || userRepository.count() > 0) {
                return;
            }

            User admin = new User("Admin User", "admin@taskflow.dev",
                    passwordEncoder.encode("Admin@123"), Role.ADMIN);
            admin.setAvatarColor("#8b5cf6");
            userRepository.save(admin);

            User srisai = new User("Srisai Kotni", "srisai@taskflow.dev",
                    passwordEncoder.encode("Demo@123"), Role.MEMBER);
            srisai.setAvatarColor("#6366f1");
            userRepository.save(srisai);

            User priya = new User("Priya Sharma", "priya@taskflow.dev",
                    passwordEncoder.encode("Demo@123"), Role.MEMBER);
            priya.setAvatarColor("#ec4899");
            userRepository.save(priya);

            Project project = new Project("TaskFlow Launch",
                    "Build and ship the TaskFlow collaborative project management tool.", admin);
            project.getMembers().add(srisai);
            project.getMembers().add(priya);
            projectRepository.save(project);

            Task t1 = task(project, srisai, srisai, "Design MySQL + H2 schema",
                    "Normalized tables for users, projects, tasks, comments with composite indexes.",
                    TaskStatus.DONE, TaskPriority.HIGH, LocalDate.now().minusDays(3), 0);
            Task t2 = task(project, srisai, srisai, "Implement JWT auth + BCrypt",
                    "Stateless security: register, login, role-based access control.",
                    TaskStatus.DONE, TaskPriority.URGENT, LocalDate.now().minusDays(1), 1);
            Task t3 = task(project, srisai, priya, "REST API for projects & tasks",
                    "Layered services, DTOs, validation, global exception handling.",
                    TaskStatus.IN_PROGRESS, TaskPriority.HIGH, LocalDate.now().plusDays(2), 2);
            Task t4 = task(project, srisai, srisai, "React kanban board",
                    "Vite + React Router, axios client, status columns with move actions.",
                    TaskStatus.IN_PROGRESS, TaskPriority.MEDIUM, LocalDate.now().plusDays(4), 3);
            Task t5 = task(project, srisai, priya, "WebSocket notifications",
                    "Push task-assign and comment events to connected users in real time.",
                    TaskStatus.TODO, TaskPriority.MEDIUM, LocalDate.now().plusDays(7), 4);
            Task t6 = task(project, srisai, srisai, "Dashboard with completion metrics",
                    "Streams + groupingBy aggregations; overdue detection and member breakdown.",
                    TaskStatus.TODO, TaskPriority.HIGH, LocalDate.now().minusDays(1), 5);

            taskRepository.saveAll(List.of(t1, t2, t3, t4, t5, t6));

            commentRepository.save(new Comment("Great schema design - normalize carefully!",
                    t1, srisai));
            commentRepository.save(new Comment("Will handle the React board, JWT integration is crisp.",
                    t4, priya));

            log.info("Demo workspace seeded. Logins: admin@taskflow.dev/Admin@123, "
                    + "srisai@taskflow.dev/Demo@123, priya@taskflow.dev/Demo@123");
        };
    }

    private Task task(Project project, User creator, User assignee, String title, String description,
                      TaskStatus status, TaskPriority priority, LocalDate dueDate, int position) {
        Task task = new Task();
        task.setTitle(title);
        task.setDescription(description);
        task.setStatus(status);
        task.setPriority(priority);
        task.setDueDate(dueDate);
        task.setPosition(position);
        task.setProject(project);
        task.setCreatedBy(creator);
        task.setAssignee(assignee);
        return task;
    }
}