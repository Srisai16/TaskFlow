package com.taskflow.controller;

import com.taskflow.dto.ProjectDtos;
import com.taskflow.service.ProjectService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService projectService;

    public ProjectController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public ResponseEntity<List<ProjectDtos.ProjectResponse>> myProjects() {
        return ResponseEntity.ok(projectService.listMyProjects());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProjectDtos.ProjectDetailResponse> getProject(@PathVariable Long id) {
        return ResponseEntity.ok(projectService.getProject(id));
    }

    @PostMapping
    public ResponseEntity<ProjectDtos.ProjectResponse> create(
            @Valid @RequestBody ProjectDtos.ProjectRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.createProject(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProjectDtos.ProjectResponse> update(
            @PathVariable Long id, @Valid @RequestBody ProjectDtos.ProjectRequest request) {
        return ResponseEntity.ok(projectService.updateProject(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        projectService.deleteProject(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/members")
    public ResponseEntity<ProjectDtos.MemberResponse> addMember(
            @PathVariable Long id, @Valid @RequestBody ProjectDtos.AddMemberRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(projectService.addMember(id, request));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Void> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        projectService.removeMember(id, userId);
        return ResponseEntity.noContent().build();
    }
}