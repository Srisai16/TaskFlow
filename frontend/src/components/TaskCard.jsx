import Avatar from "./Avatar";

const PRIORITY_CLASS = {
  URGENT: "prio-urgent",
  HIGH: "prio-high",
  MEDIUM: "prio-medium",
  LOW: "prio-low",
};

function dateClass(t) {
  if (!t.dueDate) return null;
  if (t.overdue) return "due overdue";
  return "due";
}

export default function TaskCard({ task, canManage, onOpen, onMove }) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
    <div className="task-card" onClick={onOpen} role="button" tabIndex={0}>
      <div className="task-card-top">
        <span className={`priority ${PRIORITY_CLASS[task.priority] || ""}`}>
          {task.priority}
        </span>
        {canManage && onMove && (
          <span
            className="move-btn"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onMove();
            }}
            title="Move to next stage"
          >
            &#8250;
          </span>
        )}
      </div>
      <span className="task-title">{task.title}</span>
      {task.description && (
        <span className="task-desc muted">{task.description.slice(0, 90)}</span>
      )}
      <div className="task-card-footer">
        {task.dueDate && <span className={dateClass(task)}>{task.dueDate}</span>}
        {task.assigneeName ? (
          <Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={24} />
        ) : (
          <span className="muted">Unassigned</span>
        )}
      </div>
    </div>
  );
}

