package com.taskflow.dto;

import java.util.List;
import java.util.Map;

public final class DashboardDtos {

    public record StatusCount(long todo, long inProgress, long inReview, long done, long total) {
    }

    public record MemberStat(String userEmail, String userName, long assigned, long completed) {
    }

    public record DashboardStats(StatusCount statuses,
                                 long overdue,
                                 double completionRate,
                                 Map<String, Long> tasksByPriority,
                                 List<MemberStat> memberBreakdown) {
    }
}