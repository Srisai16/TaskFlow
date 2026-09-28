import { useMemo, useState } from "react";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { dueStatus, PRIORITY_META, STATUS_META } from "../utils/format";
import { ISSUE_TYPES, parseTaskMetadata } from "../utils/jira";

export default function SprintBacklogView({
  tasks = [],
  members = [],
  canManage,
  onOpenTask,
  onUpdateTask,
  onCreateTask,
}) {
  const [newSprintIssueTitle, setNewSprintIssueTitle] = useState("");
  const [newBacklogIssueTitle, setNewBacklogIssueTitle] = useState("");
  const [sprintGoal, setSprintGoal] = useState("Deliver core MVP deliverables and complete high-priority bug fixes.");
  const [editingGoal, setEditingGoal] = useState(false);

  // Separate tasks into Active Sprint and Product Backlog
  const { sprintTasks, backlogTasks } = useMemo(() => {
    const sTasks = [];
    const bTasks = [];

    tasks.forEach((task) => {
      const { meta } = parseTaskMetadata(task);
      if (meta.sprint === "backlog") {
        bTasks.push({ task, meta });
      } else {
        sTasks.push({ task, meta });
      }
    });

    return { sprintTasks: sTasks, backlogTasks: bTasks };
  }, [tasks]);

  const sprintPoints = sprintTasks.reduce((sum, item) => sum + (item.meta.storyPoints || 0), 0);
  const backlogPoints = backlogTasks.reduce((sum, item) => sum + (item.meta.storyPoints || 0), 0);

  const sprintDoneTasks = sprintTasks.filter((item) => item.task.status === "DONE");
  const sprintProgress = sprintTasks.length
    ? Math.round((sprintDoneTasks.length / sprintTasks.length) * 100)
    : 0;

  // Move task between sprint and backlog
  const handleMoveSprint = (taskItem, targetSprint) => {
    const { meta } = taskItem;
    onUpdateTask(taskItem.task.id, {
      ...taskItem.task,
      description: taskItem.task.description, // will be parsed/serialized by handler
      sprint: targetSprint,
    });
  };

  const handleCreateSprintTask = (e) => {
    e.preventDefault();
    if (!newSprintIssueTitle.trim()) return;
    onCreateTask({
      title: newSprintIssueTitle.trim(),
      status: "TODO",
      sprint: "active",
    });
    setNewSprintIssueTitle("");
  };

  const handleCreateBacklogTask = (e) => {
    e.preventDefault();
    if (!newBacklogIssueTitle.trim()) return;
    onCreateTask({
      title: newBacklogIssueTitle.trim(),
      status: "TODO",
      sprint: "backlog",
    });
    setNewBacklogIssueTitle("");
  };

  const renderBacklogRow = (item, isSprint) => {
    const { task, meta } = item;
    const issueType = ISSUE_TYPES[meta.issueType] || ISSUE_TYPES.TASK;
    const priority = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const status = STATUS_META[task.status] || STATUS_META.TODO;
    const due = dueStatus(task.dueDate, task.status);

    return (
      <div
        key={task.id}
        className={`jira-backlog-row ${task.status === "DONE" ? "is-done" : ""}`}
        onClick={() => onOpenTask(task.id)}
      >
        <div className="jira-backlog-row-left">
          <span
            className="jira-type-badge"
            style={{ color: issueType.color, backgroundColor: issueType.bg }}
            title={issueType.label}
          >
            <Icon name={issueType.icon} size={13} />
          </span>

          <span className="jira-backlog-key">{meta.issueKey}</span>

          <strong className="jira-backlog-title">{task.title}</strong>

          {meta.labels.map((l) => (
            <span key={l} className="jira-tag-chip small">
              {l}
            </span>
          ))}
        </div>

        <div className="jira-backlog-row-right" onClick={(e) => e.stopPropagation()}>
          <span className={`status-pill ${status.className}`}>
            <i />
            {status.label}
          </span>

          <span className={`priority ${priority.className}`} title={priority.label}>
            <Icon name="flag" size={12} />
          </span>

          {meta.storyPoints > 0 && (
            <span className="jira-points-badge" title={`${meta.storyPoints} Story Points`}>
              {meta.storyPoints}
            </span>
          )}

          {task.assigneeName ? (
            <Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={24} decorative />
          ) : (
            <span className="jira-unassigned-dot" title="Unassigned">
              <Icon name="user" size={12} />
            </span>
          )}

          {canManage && (
            <button
              type="button"
              className="jira-move-sprint-btn"
              onClick={() => handleMoveSprint(item, isSprint ? "backlog" : "active")}
              title={isSprint ? "Move to Backlog" : "Move to Active Sprint"}
            >
              <Icon name={isSprint ? "chevronDown" : "chevronUp"} size={14} />
              <span>{isSprint ? "To Backlog" : "To Sprint"}</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="jira-sprint-backlog-view">
      {/* Active Sprint Section */}
      <section className="jira-sprint-container">
        <header className="jira-sprint-header">
          <div className="jira-sprint-header-top">
            <div className="jira-sprint-title-group">
              <span className="jira-sprint-badge">
                <Icon name="zap" size={14} />
                <span>Active Sprint</span>
              </span>
              <h3>Sprint 1 — Core Execution</h3>
              <span className="jira-sprint-date-range">Active · 2 weeks remaining</span>
            </div>

            <div className="jira-sprint-stats-group">
              <span className="jira-stat-pill" title="Total Story Points">
                <strong>{sprintPoints}</strong> SP
              </span>
              <span className="jira-stat-pill" title="Issues in Sprint">
                <strong>{sprintTasks.length}</strong> Issues
              </span>
              <span className="jira-stat-pill green" title="Completed">
                <strong>{sprintProgress}%</strong> Done
              </span>
            </div>
          </div>

          <div className="jira-sprint-goal-row">
            <Icon name="target" size={15} />
            {editingGoal ? (
              <input
                type="text"
                className="jira-goal-input"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                onBlur={() => setEditingGoal(false)}
                autoFocus
              />
            ) : (
              <span className="jira-sprint-goal" onClick={() => canManage && setEditingGoal(true)}>
                Goal: {sprintGoal}
              </span>
            )}
            {canManage && !editingGoal && (
              <button
                type="button"
                className="jira-link-action"
                onClick={() => setEditingGoal(true)}
              >
                Edit
              </button>
            )}
          </div>
        </header>

        <div className="jira-backlog-list">
          {sprintTasks.length === 0 ? (
            <div className="jira-backlog-empty">
              <Icon name="zap" size={24} />
              <p>No issues in the active sprint. Drag or move issues from Backlog below.</p>
            </div>
          ) : (
            sprintTasks.map((item) => renderBacklogRow(item, true))
          )}
        </div>

        {canManage && (
          <form className="jira-quick-add-row" onSubmit={handleCreateSprintTask}>
            <Icon name="plus" size={15} />
            <input
              type="text"
              value={newSprintIssueTitle}
              onChange={(e) => setNewSprintIssueTitle(e.target.value)}
              placeholder="+ Create issue in Active Sprint..."
            />
            {newSprintIssueTitle.trim() && (
              <button type="submit" className="btn primary small">
                Create
              </button>
            )}
          </form>
        )}
      </section>

      {/* Product Backlog Section */}
      <section className="jira-backlog-container">
        <header className="jira-backlog-header">
          <div className="jira-backlog-title-group">
            <span className="jira-backlog-badge">
              <Icon name="layers" size={14} />
              <span>Product Backlog</span>
            </span>
            <h3>Backlog Pool</h3>
          </div>

          <div className="jira-backlog-stats-group">
            <span className="jira-stat-pill" title="Backlog Story Points">
              <strong>{backlogPoints}</strong> SP
            </span>
            <span className="jira-stat-pill" title="Backlog Items">
              <strong>{backlogTasks.length}</strong> Issues
            </span>
          </div>
        </header>

        <div className="jira-backlog-list">
          {backlogTasks.length === 0 ? (
            <div className="jira-backlog-empty">
              <Icon name="layers" size={24} />
              <p>Backlog is empty. Add new items below to prioritize future work.</p>
            </div>
          ) : (
            backlogTasks.map((item) => renderBacklogRow(item, false))
          )}
        </div>

        {canManage && (
          <form className="jira-quick-add-row" onSubmit={handleCreateBacklogTask}>
            <Icon name="plus" size={15} />
            <input
              type="text"
              value={newBacklogIssueTitle}
              onChange={(e) => setNewBacklogIssueTitle(e.target.value)}
              placeholder="+ Create issue in Product Backlog..."
            />
            {newBacklogIssueTitle.trim() && (
              <button type="submit" className="btn primary small">
                Create in Backlog
              </button>
            )}
          </form>
        )}
      </section>
    </div>
  );
}
