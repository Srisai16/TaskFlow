import Avatar from "./Avatar";
import Icon from "./Icon";
import { dueStatus, PRIORITY_META, STATUS_META } from "../utils/format";

export default function TaskCard({ task, canManage, onOpen, onMove, moving = false, moveLabel = "Next stage" }) {
  const priority = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
  const due = dueStatus(task.dueDate, task.status);
  const status = STATUS_META[task.status] || STATUS_META.TODO;
  const metadata = [
    priority.label,
    status.label,
    due.label,
    task.commentCount > 0 ? `${task.commentCount} comments` : "",
    task.assigneeName ? `Assigned to ${task.assigneeName}` : "Unassigned",
  ].filter(Boolean);

  return (
    <article className={`task-card ${task.status === "DONE" ? "is-done" : ""}`}>
      <button
        type="button"
        className="task-card-open"
        onClick={onOpen}
        aria-label={`Open task ${task.title}. ${metadata.join(". ")}.`}
      >
        <span className="task-card-top">
          <span className={`priority ${priority.className}`}>
            <i aria-hidden="true" />
            {priority.label}
          </span>
          {task.status === "DONE" && <span className="task-done-mark"><Icon name="check" size={13} /></span>}
        </span>
        <span className="task-title">{task.title}</span>
        {task.description && <span className="task-desc">{task.description}</span>}
        <span className="task-meta-row">
          {due.label ? (
            <span className={`due ${due.className}`}><Icon name="calendar" size={14} />{due.label}</span>
          ) : (
            <span className="due"><Icon name="calendar" size={14} />No due date</span>
          )}
          {task.commentCount > 0 && <span className="comment-count"><Icon name="comment" size={14} />{task.commentCount}</span>}
        </span>
        <span className="task-card-footer">
          <span className="task-status-mobile">{status.shortLabel}</span>
          {task.assigneeName ? (
            <span className="task-assignee">
              <Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={26} decorative />
              <span>{task.assigneeName}</span>
            </span>
          ) : (
            <span className="unassigned"><Avatar name="Unassigned" size={26} decorative />Unassigned</span>
          )}
        </span>
      </button>
      {canManage && onMove && (
        <button
          type="button"
          className="task-move"
          onClick={onMove}
          disabled={moving}
          aria-label={`Move ${task.title} to ${moveLabel}`}
          title={`Move to ${moveLabel}`}
        >
          {moving ? <span className="mini-spinner" /> : <Icon name="arrowRight" size={16} />}
        </button>
      )}
    </article>
  );
}
