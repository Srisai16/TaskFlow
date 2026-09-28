import { useMemo } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { PRIORITIES, STATUSES } from "../utils/format";
import { exportProjectToJSON, exportTasksToCSV, ISSUE_TYPES, parseTaskMetadata } from "../utils/jira";

export default function AnalyticsDashboardView({
  project,
  tasks = [],
  stats,
  members = [],
  onOpenTask,
}) {
  // Aggregate Issue Types
  const typeCounts = useMemo(() => {
    const counts = { TASK: 0, STORY: 0, BUG: 0, EPIC: 0, IMPROVEMENT: 0 };
    tasks.forEach((t) => {
      const { meta } = parseTaskMetadata(t);
      const type = meta.issueType || "TASK";
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  // Aggregate Story Points
  const storyPointStats = useMemo(() => {
    let totalPoints = 0;
    let completedPoints = 0;

    tasks.forEach((t) => {
      const { meta } = parseTaskMetadata(t);
      const pts = meta.storyPoints || 0;
      totalPoints += pts;
      if (t.status === "DONE") {
        completedPoints += pts;
      }
    });

    const completionRate = totalPoints ? Math.round((completedPoints / totalPoints) * 100) : 0;
    return { totalPoints, completedPoints, openPoints: totalPoints - completedPoints, completionRate };
  }, [tasks]);

  // Workload by member
  const memberAllocation = useMemo(() => {
    return members.map((m) => {
      const assigned = tasks.filter((t) => String(t.assigneeId) === String(m.id));
      const done = assigned.filter((t) => t.status === "DONE").length;
      const points = assigned.reduce((sum, t) => sum + (parseTaskMetadata(t).meta.storyPoints || 0), 0);
      return {
        ...m,
        assignedCount: assigned.length,
        doneCount: done,
        openCount: assigned.length - done,
        points,
      };
    }).sort((a, b) => b.points - a.points);
  }, [members, tasks]);

  const atRiskTasks = useMemo(() => {
    return tasks.filter((t) => t.overdue || (!t.assigneeId && t.status !== "DONE"));
  }, [tasks]);

  return (
    <div className="jira-analytics-view">
      {/* Top Header with Export Actions */}
      <header className="jira-analytics-header">
        <div className="jira-analytics-title-group">
          <span className="jira-analytics-badge">
            <Icon name="barChart" size={14} />
            <span>Project Intelligence</span>
          </span>
          <h3>Sprint Velocity &amp; Delivery Analytics</h3>
        </div>

        <div className="jira-export-actions">
          <button
            type="button"
            className="btn secondary small"
            onClick={() => exportTasksToCSV(project?.name, tasks)}
            title="Download CSV report"
          >
            <Icon name="download" size={14} />
            <span>Export CSV</span>
          </button>
          <button
            type="button"
            className="btn secondary small"
            onClick={() => exportProjectToJSON(project, tasks, members)}
            title="Export full JSON backup"
          >
            <Icon name="copy" size={14} />
            <span>Export JSON</span>
          </button>
        </div>
      </header>

      {/* Hero Metrics Row */}
      <div className="jira-analytics-grid-4">
        <div className="jira-metric-tile accent-indigo">
          <div className="jira-tile-head">
            <span>Sprint Velocity</span>
            <Icon name="zap" size={18} />
          </div>
          <div className="jira-tile-val">
            <strong>{storyPointStats.completedPoints}</strong>
            <small>of {storyPointStats.totalPoints} SP</small>
          </div>
          <div className="jira-tile-meter">
            <div style={{ width: `${storyPointStats.completionRate}%` }} />
          </div>
          <span className="jira-tile-foot">{storyPointStats.completionRate}% of planned points burned</span>
        </div>

        <div className="jira-metric-tile accent-cyan">
          <div className="jira-tile-head">
            <span>Issues Closed</span>
            <Icon name="checkCircle" size={18} />
          </div>
          <div className="jira-tile-val">
            <strong>{stats?.statuses?.done || 0}</strong>
            <small>of {tasks.length} issues</small>
          </div>
          <div className="jira-tile-meter">
            <div style={{ width: `${stats?.completionRate || 0}%` }} />
          </div>
          <span className="jira-tile-foot">{stats?.statuses?.inProgress || 0} currently in progress</span>
        </div>

        <div className="jira-metric-tile accent-red">
          <div className="jira-tile-head">
            <span>Blocked &amp; Overdue</span>
            <Icon name="alert" size={18} />
          </div>
          <div className="jira-tile-val">
            <strong>{stats?.overdue || 0}</strong>
            <small>action required</small>
          </div>
          <div className="jira-tile-meter red">
            <div style={{ width: `${Math.min(100, ((stats?.overdue || 0) / (tasks.length || 1)) * 100)}%` }} />
          </div>
          <span className="jira-tile-foot">{stats?.overdue ? "Urgent attention needed" : "Clean delivery timeline"}</span>
        </div>

        <div className="jira-metric-tile accent-purple">
          <div className="jira-tile-head">
            <span>Team Allocation</span>
            <Icon name="users" size={18} />
          </div>
          <div className="jira-tile-val">
            <strong>{members.length}</strong>
            <small>active members</small>
          </div>
          <div className="jira-tile-meter purple">
            <div style={{ width: "100%" }} />
          </div>
          <span className="jira-tile-foot">{members.length * 40} available engineering hours</span>
        </div>
      </div>

      {/* Main 2-column analytics split */}
      <div className="jira-analytics-split">
        {/* Left Column: Issue Types & Priority Distribution */}
        <div className="jira-split-col">
          {/* Issue Type Mix */}
          <section className="jira-analytics-card">
            <div className="jira-card-heading">
              <Icon name="layers" size={16} />
              <h4>Issue Type Distribution</h4>
            </div>

            <div className="jira-type-bars">
              {Object.values(ISSUE_TYPES).map((type) => {
                const count = typeCounts[type.id] || 0;
                const max = Math.max(1, ...Object.values(typeCounts));
                const pct = Math.round((count / (tasks.length || 1)) * 100);

                return (
                  <div key={type.id} className="jira-type-bar-row">
                    <div className="jira-type-bar-info">
                      <span
                        className="jira-type-badge"
                        style={{ color: type.color, backgroundColor: type.bg }}
                      >
                        <Icon name={type.icon} size={13} />
                      </span>
                      <strong>{type.label}</strong>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="jira-progress-track">
                      <div
                        className="jira-progress-bar"
                        style={{ width: `${(count / max) * 100}%`, backgroundColor: type.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Priority Breakdown */}
          <section className="jira-analytics-card">
            <div className="jira-card-heading">
              <Icon name="flag" size={16} />
              <h4>Priority Breakdown</h4>
            </div>

            <div className="jira-priority-grid">
              {PRIORITIES.map((p) => {
                const count = tasks.filter((t) => t.priority === p.value).length;
                return (
                  <div key={p.value} className={`jira-priority-box ${p.className}`}>
                    <Icon name="flag" size={16} />
                    <strong>{count}</strong>
                    <span>{p.label} Priority</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Right Column: Member Capacity & At-Risk Issues */}
        <div className="jira-split-col">
          {/* Member Workload Table */}
          <section className="jira-analytics-card">
            <div className="jira-card-heading">
              <Icon name="users" size={16} />
              <h4>Team Velocity &amp; Allocation</h4>
            </div>

            <div className="jira-workload-table">
              {memberAllocation.map((m) => (
                <div key={m.id} className="jira-workload-row">
                  <Avatar name={m.name} size={32} decorative />
                  <div className="jira-workload-name">
                    <strong>{m.name}</strong>
                    <span>{m.openCount} open · {m.doneCount} done</span>
                  </div>
                  <span className="jira-workload-pts">{m.points} SP</span>
                </div>
              ))}
            </div>
          </section>

          {/* At-Risk Issues Radar */}
          <section className="jira-analytics-card">
            <div className="jira-card-heading">
              <Icon name="alert" size={16} />
              <h4>At-Risk Issues Radar</h4>
            </div>

            {atRiskTasks.length === 0 ? (
              <div className="jira-radar-empty">
                <Icon name="checkCircle" size={24} />
                <span>All issues are assigned and on schedule!</span>
              </div>
            ) : (
              <div className="jira-risk-list">
                {atRiskTasks.slice(0, 5).map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    className="jira-risk-item"
                    onClick={() => onOpenTask(t.id)}
                  >
                    <span className={`jira-risk-dot ${t.overdue ? "overdue" : "unassigned"}`} />
                    <strong>{t.title}</strong>
                    <span className="jira-risk-reason">{t.overdue ? "Overdue" : "Unassigned"}</span>
                    <Icon name="chevronRight" size={13} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
