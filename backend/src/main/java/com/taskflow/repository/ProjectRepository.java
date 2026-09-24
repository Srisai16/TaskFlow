package com.taskflow.repository;

import com.taskflow.entity.Project;
import com.taskflow.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @Query("select distinct p from Project p join p.members m where m = :user order by p.updatedAt desc")
    List<Project> findAllForMember(@Param("user") User user);
}