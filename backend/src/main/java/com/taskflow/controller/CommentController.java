package com.taskflow.controller;

import com.taskflow.dto.CommentDtos;
import com.taskflow.service.CommentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class CommentController {

    private final CommentService commentService;

    public CommentController(CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/projects/{projectId}/tasks/{taskId}/comments")
    public ResponseEntity<List<CommentDtos.CommentResponse>> list(
            @PathVariable Long projectId, @PathVariable Long taskId) {
        return ResponseEntity.ok(commentService.listComments(projectId, taskId));
    }

    @PostMapping("/projects/{projectId}/tasks/{taskId}/comments")
    public ResponseEntity<CommentDtos.CommentResponse> add(
            @PathVariable Long projectId, @PathVariable Long taskId,
            @Valid @RequestBody CommentDtos.CommentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(commentService.addComment(projectId, taskId, request));
    }

    @DeleteMapping("/projects/{projectId}/comments/{commentId}")
    public ResponseEntity<Void> delete(@PathVariable Long projectId, @PathVariable Long commentId) {
        commentService.deleteComment(projectId, commentId);
        return ResponseEntity.noContent().build();
    }
}