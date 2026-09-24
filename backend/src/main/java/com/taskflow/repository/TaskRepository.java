package com.taskflow.repository;

import com.taskflow.entity.Project;
import com.taskflow.entity.Task;
import com.taskflow.entity.TaskStatus;
import com.taskflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {

    List<Task> findByProject(Project project);

    long countByProject(Project project);

    long countByProjectAndStatus(Project project, TaskStatus status);

    long countByProjectAndDueDateBeforeAndStatusNot(Project project, LocalDate date, TaskStatus status);

    long countByAssignee(User assignee);
}