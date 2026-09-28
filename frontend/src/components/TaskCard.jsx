import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { dueStatus, PRIORITY_META, STATUS_META } from "../utils/format";
import { ISSUE_TYPES, parseTaskMetadata } from "../utils/jira";

export default function TaskCard({
  task,
  canManage,
  moving,
  onOpen,
  onMove,
  moveLabel,
  onDragStart,
  onDelete,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { cleanDescription, meta } = useMemo(() => parseTaskMetadata(task), [task]);
  const issueType = ISSUE_TYPES[meta.issueType] || ISSUE_TYPES.TASK;
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
  const due = dueStatus(task.dueDate, task.status);

  const subtasksTotal = meta.subtasks.length;
  const subtasksDone = meta.subtasks.filter((s) => s.done).length;
  const hasSubtasks = subtasksTotal > 0;
  const subtaskPercent = hasSubtasks ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", String(task.id));
    e.dataTransfer.effectAllowed = "move";
    if (onDragStart) onDragStart(task);
  };

  return (
    <article
      className={`jira-card ${task.overdue || due.className === "overdue" ? "is-overdue" : ""} ${moving ? "is-moving" : ""}`}
      draggable={canManage}
      onDragStart={handleDragStart}
      onClick={onOpen}
      tabIndex={0}
      role="button"
      aria-label={`${meta.issueKey}: ${task.title}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {/* Top row: Issue Type, Key, Priority, Drag handle */}
      <div className="jira-card-header">
        <div className="jira-card-key-group">
          <span
            className="jira-type-badge"
            style={{ color: issueType.color, backgroundColor: issueType.bg, borderColor: issueType.border }}
            title={`Type: ${issueType.label}`}
          >
            <Icon name={issueType.icon} size={13} />
          </span>
          <span className="jira-card-key">{meta.issueKey}</span>
        </div>

        <div className="jira-card-header-actions" onClick={(e) => e.stopPropagation()}>
          <span className={`jira-priority-pill ${priority.className}`} title={`Priority: ${priority.label}`}>
            <Icon name="flag" size={12} />
            <span className="sr-only">{priority.label}</span>
          </span>

          {meta.storyPoints > 0 && (
            <span className="jira-points-badge" title={`${meta.storyPoints} Story Points`}>
              {meta.storyPoints}
            </span>
          )}

          {canManage && (
            <span className="jira-drag-grip" title="Drag to move column">
              <Icon name="gripVertical" size={13} />
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className="jira-card-title">{task.title}</h4>

      {/* Clean snippet if description exists */}
      {cleanDescription && (
        <p className="jira-card-snippet">{cleanDescription.slice(0, 100)}{cleanDescription.length > 100 ? "…" : ""}</p>
      )}

      {/* Labels / Tags */}
      {meta.labels.length > 0 && (
        <div className="jira-card-labels">
          {meta.labels.slice(0, 3).map((label) => (
            <span key={label} className="jira-tag-chip">
              <Icon name="tag" size={10} />
              {label}
            </span>
          ))}
          {meta.labels.length > 3 && (
            <span className="jira-tag-more">+{meta.labels.length - 3}</span>
          )}
        </div>
      )}

      {/* Subtasks progress meter */}
      {hasSubtasks && (
        <div className="jira-card-subtasks" title={`${subtasksDone} of ${subtasksTotal} subtasks completed`}>
          <div className="jira-subtask-info">
            <Icon name="checkSquare" size={12} />
            <span>{subtasksDone}/{subtasksTotal}</span>
            <span className="jira-subtask-pct">{subtaskPercent}%</span>
          </div>
          <div className="jira-subtask-bar">
            <div className="jira-subtask-fill" style={{ width: `${subtaskPercent}%` }} />
          </div>
        </div>
      )}

      {/* Card Footer: Due Date, Comments count, Assignee */}
      <div className="jira-card-footer" onClick={(e) => e.stopPropagation()}>
        <div className="jira-card-footer-left">
          {due.label && (
            <span className={`jira-due-pill ${due.className}`} title={`Due: ${task.dueDate}`}>
              <Icon name="clock" size={12} />
              <span>{due.label}</span>
            </span>
          )}

          {Number(task.commentCount || 0) > 0 && (
            <span className="jira-comment-count" title={`${task.commentCount} comments`}>
              <Icon name="comment" size={12} />
              <span>{task.commentCount}</span>
            </span>
          )}
        </div>

        <div className="jira-card-footer-right">
          {task.assigneeName ? (
            <div className="jira-assignee-chip" title={`Assigned to ${task.assigneeName}`}>
              <Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={24} decorative />
            </div>
          ) : (
            <span className="jira-unassigned-chip" title="Unassigned">
              <Icon name="user" size={13} />
            </span>
          )}

          {canManage && onMove && (
            <button
              type="button"
              className="jira-stage-btn"
              onClick={(e) => {
                e.stopPropagation();
                onMove();
              }}
              disabled={moving}
              title={`Advance to ${moveLabel}`}
              aria-label={`Advance to ${moveLabel}`}
            >
              {moving ? <span className="mini-spinner" /> : <Icon name="arrowRight" size={13} />}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
