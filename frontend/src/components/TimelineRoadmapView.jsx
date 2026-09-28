import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { formatDate, PRIORITY_META, STATUS_META } from "../utils/format";
import { ISSUE_TYPES, parseTaskMetadata } from "../utils/jira";

export default function TimelineRoadmapView({ tasks = [], onOpenTask }) {
  const [zoomLevel, setZoomLevel] = useState("month"); // "month" | "quarter"

  // Compute timeline boundaries
  const { startDate, endDate, daysCount, timelineDays } = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + (zoomLevel === "quarter" ? 3 : 1), 0);

    const days = [];
    const curr = new Date(start);
    while (curr <= end) {
      days.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    return {
      startDate: start,
      endDate: end,
      daysCount: days.length,
      timelineDays: days,
    };
  }, [zoomLevel]);

  // Map tasks onto timeline positions
  const taskBars = useMemo(() => {
    return tasks.map((task) => {
      const { meta } = parseTaskMetadata(task);
      const issueType = ISSUE_TYPES[meta.issueType] || ISSUE_TYPES.TASK;
      const statusObj = STATUS_META[task.status] || STATUS_META.TODO;

      let taskStart = task.createdAt ? new Date(task.createdAt) : new Date();
      let taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(taskStart.getTime() + 7 * 86400000);

      // Clamp within timeline view
      const startOffset = Math.max(0, Math.floor((taskStart - startDate) / 86400000));
      const endOffset = Math.min(daysCount, Math.floor((taskEnd - startDate) / 86400000) + 1);
      const durationDays = Math.max(2, endOffset - startOffset);

      const leftPercent = (startOffset / daysCount) * 100;
      const widthPercent = Math.max(4, (durationDays / daysCount) * 100);

      return {
        task,
        meta,
        issueType,
        statusObj,
        leftPercent,
        widthPercent,
        taskStart,
        taskEnd,
      };
    });
  }, [tasks, startDate, daysCount]);

  return (
    <div className="jira-timeline-view">
      <header className="jira-timeline-header">
        <div className="jira-timeline-title-group">
          <span className="jira-timeline-badge">
            <Icon name="calendar" size={14} />
            <span>Roadmap &amp; Delivery Timeline</span>
          </span>
          <h3>Sprint Timeline &amp; Milestones</h3>
        </div>

        <div className="jira-timeline-controls">
          <button
            type="button"
            className={`btn ghost small ${zoomLevel === "month" ? "active" : ""}`}
            onClick={() => setZoomLevel("month")}
          >
            Current Month
          </button>
          <button
            type="button"
            className={`btn ghost small ${zoomLevel === "quarter" ? "active" : ""}`}
            onClick={() => setZoomLevel("quarter")}
          >
            Quarter View
          </button>
        </div>
      </header>

      <div className="jira-timeline-table-shell">
        {/* Days Header */}
        <div className="jira-timeline-scale">
          <div className="jira-scale-sidebar-head">Issue &amp; Assignee</div>
          <div className="jira-scale-days-row">
            {timelineDays.filter((_, i) => (zoomLevel === "quarter" ? i % 7 === 0 : i % 2 === 0)).map((d, idx) => (
              <span key={idx} className="jira-scale-day-marker">
                {d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            ))}
          </div>
        </div>

        {/* Task Rows */}
        <div className="jira-timeline-rows">
          {taskBars.length === 0 ? (
            <div className="jira-timeline-empty">
              <Icon name="calendar" size={24} />
              <p>No tasks scheduled in this timeline timeframe.</p>
            </div>
          ) : (
            taskBars.map((bar) => {
              const { task, meta, issueType, statusObj, leftPercent, widthPercent } = bar;
              return (
                <div
                  key={task.id}
                  className="jira-timeline-row"
                  onClick={() => onOpenTask(task.id)}
                >
                  <div className="jira-timeline-row-info">
                    <span
                      className="jira-type-badge"
                      style={{ color: issueType.color, backgroundColor: issueType.bg }}
                    >
                      <Icon name={issueType.icon} size={12} />
                    </span>
                    <span className="jira-row-key">{meta.issueKey}</span>
                    <strong className="jira-row-title">{task.title}</strong>
                    {task.assigneeName && (
                      <Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={20} decorative />
                    )}
                  </div>

                  <div className="jira-timeline-track">
                    <div
                      className={`jira-timeline-bar ${statusObj.className}`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      title={`${task.title} (${formatDate(task.dueDate || task.createdAt)})`}
                    >
                      <span className="jira-bar-label">{task.title}</span>
                      <span className="jira-bar-status">{statusObj.label}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
