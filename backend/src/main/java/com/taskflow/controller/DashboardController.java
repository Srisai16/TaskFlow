package com.taskflow.controller;

import com.taskflow.dto.DashboardDtos;
import com.taskflow.service.DashboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects/{projectId}/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public ResponseEntity<DashboardDtos.DashboardStats> stats(@PathVariable Long projectId) {
        return ResponseEntity.ok(dashboardService.getStats(projectId));
    }
}