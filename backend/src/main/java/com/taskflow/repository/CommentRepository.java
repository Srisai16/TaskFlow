package com.taskflow.repository;

import com.taskflow.entity.Comment;
import com.taskflow.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    List<Comment> findByTaskOrderByCreatedAtAsc(Task task);

    @Query("select c.task.id, count(c) from Comment c where c.task.id in :taskIds group by c.task.id")
    List<Object[]> countByTaskIds(@Param("taskIds") List<Long> taskIds);
}