import { useCallback, useEffect, useMemo, useState } from "react";
import api, { getErrorMessage } from "../api/client";
import { useToast } from "../context/ToastContext";
import Avatar from "./Avatar";
import Icon from "./Icon";
import Spinner from "./Spinner";
import ConfirmDialog from "./ConfirmDialog";
import {
  dueStatus,
  formatDate,
  formatDateTime,
  PRIORITIES,
  PRIORITY_META,
  STATUS_META,
  STATUSES,
  timeAgo,
} from "../utils/format";
import {
  ISSUE_TYPE_LIST,
  ISSUE_TYPES,
  parseTaskMetadata,
  PRESET_LABELS,
  serializeTaskDescription,
  STORY_POINTS,
} from "../utils/jira";

export default function JiraIssueDrawer({
  projectId,
  taskId,
  tasks = [],
  members = [],
  me,
  canManage,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
}) {
  const toast = useToast();

  const currentTask = useMemo(() => tasks.find((t) => t.id === taskId) || null, [tasks, taskId]);

  const [task, setTask] = useState(currentTask);
  const [fullscreen, setFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("comments"); // comments | activity

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [issueType, setIssueType] = useState("TASK");
  const [storyPoints, setStoryPoints] = useState(2);
  const [sprint, setSprint] = useState("active");
  const [labels, setLabels] = useState([]);
  const [subtasks, setSubtasks] = useState([]);
  const [newSubtaskText, setNewSubtaskText] = useState("");
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Comments state
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // General state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Load and initialize task fields
  useEffect(() => {
    if (!currentTask) return;
    setTask(currentTask);
    setTitle(currentTask.title || "");
    setStatus(currentTask.status || "TODO");
    setPriority(currentTask.priority || "MEDIUM");
    setAssigneeId(currentTask.assigneeId ? String(currentTask.assigneeId) : "");
    setDueDate(currentTask.dueDate || "");

    const { cleanDescription, meta } = parseTaskMetadata(currentTask);
    setDescription(cleanDescription || "");
    setIssueType(meta.issueType || "TASK");
    setStoryPoints(meta.storyPoints ?? 2);
    setSprint(meta.sprint || "active");
    setLabels(meta.labels || []);
    setSubtasks(meta.subtasks || []);
  }, [currentTask]);

  // Load comments
  const loadComments = useCallback(async () => {
    if (!taskId) return;
    setLoadingComments(true);
    try {
      const response = await api.get(`/projects/${projectId}/tasks/${taskId}/comments`);
      setComments(response.data || []);
    } catch (err) {
      // ignore
    } finally {
      setLoadingComments(false);
    }
  }, [projectId, taskId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);

  // Handle escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && !pendingDelete) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, pendingDelete]);

  if (!task) return null;

  const currentType = ISSUE_TYPES[issueType] || ISSUE_TYPES.TASK;
  const currentStatus = STATUS_META[status] || STATUS_META.TODO;
  const currentPriority = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  const due = dueStatus(dueDate, status);

  const subtasksTotal = subtasks.length;
  const subtasksDone = subtasks.filter((s) => s.done).length;
  const subtaskProgress = subtasksTotal ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;

  // Save changes to task
  const handleSave = async (overrideData = {}) => {
    setSaving(true);
    setSaveError("");

    const updatedLabels = overrideData.labels !== undefined ? overrideData.labels : labels;
    const updatedSubtasks = overrideData.subtasks !== undefined ? overrideData.subtasks : subtasks;
    const updatedType = overrideData.issueType !== undefined ? overrideData.issueType : issueType;
    const updatedPoints = overrideData.storyPoints !== undefined ? overrideData.storyPoints : storyPoints;
    const updatedSprint = overrideData.sprint !== undefined ? overrideData.sprint : sprint;
    const updatedDesc = overrideData.description !== undefined ? overrideData.description : description;

    const payloadDescription = serializeTaskDescription(updatedDesc, {
      issueType: updatedType,
      storyPoints: updatedPoints,
      sprint: updatedSprint,
      labels: updatedLabels,
      subtasks: updatedSubtasks,
    });

    const payload = {
      title: (overrideData.title !== undefined ? overrideData.title : title).trim(),
      description: payloadDescription,
      status: overrideData.status !== undefined ? overrideData.status : status,
      priority: overrideData.priority !== undefined ? overrideData.priority : priority,
      assigneeId: (overrideData.assigneeId !== undefined ? overrideData.assigneeId : assigneeId) || null,
      dueDate: (overrideData.dueDate !== undefined ? overrideData.dueDate : dueDate) || null,
      position: task.position || 0,
    };

    if (!payload.title) {
      setSaveError("Title cannot be empty");
      setSaving(false);
      return;
    }

    try {
      const response = await api.put(`/projects/${projectId}/tasks/${taskId}`, payload);
      setTask(response.data);
      if (onTaskUpdated) onTaskUpdated(response.data);
      toast.success("Task updated");
    } catch (err) {
      setSaveError(getErrorMessage(err));
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Subtask actions
  const handleAddSubtask = (e) => {
    if (e) e.preventDefault();
    if (!newSubtaskText.trim()) return;
    const newItems = [
      ...subtasks,
      { id: Date.now(), text: newSubtaskText.trim(), done: false },
    ];
    setSubtasks(newItems);
    setNewSubtaskText("");
    handleSave({ subtasks: newItems });
  };

  const handleToggleSubtask = (subtaskId) => {
    const newItems = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, done: !st.done } : st
    );
    setSubtasks(newItems);
    handleSave({ subtasks: newItems });
  };

  const handleDeleteSubtask = (subtaskId) => {
    const newItems = subtasks.filter((st) => st.id !== subtaskId);
    setSubtasks(newItems);
    handleSave({ subtasks: newItems });
  };

  // Label tags
  const handleAddLabel = (labelName) => {
    const clean = labelName.trim().replace(/,/g, "");
    if (!clean || labels.includes(clean)) return;
    const newLabels = [...labels, clean];
    setLabels(newLabels);
    setNewTagInput("");
    setShowTagInput(false);
    handleSave({ labels: newLabels });
  };

  const handleRemoveLabel = (labelName) => {
    const newLabels = labels.filter((l) => l !== labelName);
    setLabels(newLabels);
    handleSave({ labels: newLabels });
  };

  // Comments
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const response = await api.post(`/projects/${projectId}/tasks/${taskId}/comments`, {
        content: newComment.trim(),
      });
      setComments((curr) => [...curr, response.data]);
      setNewComment("");
      toast.success("Comment posted");
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, commentCount: (task.commentCount || 0) + 1 });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    setDeletingCommentId(commentId);
    try {
      await api.delete(`/projects/${projectId}/comments/${commentId}`);
      setComments((curr) => curr.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
      if (onTaskUpdated) {
        onTaskUpdated({ ...task, commentCount: Math.max(0, (task.commentCount || 1) - 1) });
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingCommentId(null);
    }
  };

  // Delete Task
  const handleDeleteTask = async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}/tasks/${taskId}`);
      toast.success("Task deleted");
      if (onTaskDeleted) onTaskDeleted(taskId);
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setDeleting(false);
    }
  };

  // Copy issue link
  const handleCopyLink = () => {
    const url = `${window.location.origin}/projects/${projectId}?task=TF-${taskId}`;
    navigator.clipboard.writeText(url);
    toast.info(`Link to TF-${taskId} copied`);
  };

  return (
    <div className="jira-drawer-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className={`jira-drawer ${fullscreen ? "is-fullscreen" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top App Bar */}
        <header className="jira-drawer-bar">
          <div className="jira-drawer-bar-left">
            <div className="jira-type-selector">
              <span
                className="jira-type-badge-large"
                style={{ color: currentType.color, backgroundColor: currentType.bg, borderColor: currentType.border }}
              >
                <Icon name={currentType.icon} size={15} />
              </span>
              <select
                value={issueType}
                onChange={(e) => {
                  setIssueType(e.target.value);
                  handleSave({ issueType: e.target.value });
                }}
                disabled={!canManage}
                aria-label="Issue Type"
              >
                {ISSUE_TYPE_LIST.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <span className="jira-drawer-key">TF-{task.id}</span>

            <button
              type="button"
              className="jira-icon-action"
              onClick={handleCopyLink}
              title="Copy issue link"
            >
              <Icon name="link" size={15} />
              <span>Copy link</span>
            </button>
          </div>

          <div className="jira-drawer-bar-right">
            {canManage && (
              <button
                type="button"
                className="jira-icon-action danger"
                onClick={() => setPendingDelete(true)}
                title="Delete task"
              >
                <Icon name="trash" size={16} />
              </button>
            )}

            <button
              type="button"
              className="jira-icon-action"
              onClick={() => setFullscreen(!fullscreen)}
              title={fullscreen ? "Restore size" : "Expand to fullscreen"}
            >
              <Icon name={fullscreen ? "minimize" : "maximize"} size={16} />
            </button>

            <button
              type="button"
              className="jira-icon-action"
              onClick={onClose}
              title="Close (Esc)"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </header>

        {saveError && (
          <div className="jira-drawer-alert error">
            <Icon name="alert" size={16} />
            <span>{saveError}</span>
          </div>
        )}

        {/* Main Content Split Pane */}
        <div className="jira-drawer-body">
          {/* Left Column: Title, Description, Subtasks, Activity */}
          <div className="jira-drawer-main">
            {/* Title Input */}
            <div className="jira-title-box">
              <input
                type="text"
                className="jira-title-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleSave()}
                placeholder="Issue summary"
                disabled={!canManage}
              />
            </div>

            {/* Description Box */}
            <div className="jira-section">
              <div className="jira-section-head">
                <div className="jira-section-title">
                  <Icon name="edit" size={16} />
                  <span>Description</span>
                </div>
                <div className="jira-desc-actions">
                  <button
                    type="button"
                    className={`jira-btn-text ${previewMode ? "active" : ""}`}
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    {previewMode ? "Edit" : "Preview"}
                  </button>
                </div>
              </div>

              {previewMode ? (
                <div className="jira-desc-preview">
                  {description ? (
                    <div className="jira-markdown-view">
                      {description.split("\n").map((line, i) => (
                        <p key={i}>{line || "\u00A0"}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="jira-desc-placeholder">No description provided.</p>
                  )}
                </div>
              ) : (
                <div className="jira-desc-editor">
                  <textarea
                    className="jira-desc-textarea"
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => handleSave()}
                    placeholder="Add more context, steps to reproduce, or technical details..."
                    disabled={!canManage}
                  />
                  <div className="jira-desc-hint">
                    <span>Supports markdown formatting. Auto-saves on blur.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Subtasks / Checklist Section */}
            <div className="jira-section">
              <div className="jira-section-head">
                <div className="jira-section-title">
                  <Icon name="checkSquare" size={16} />
                  <span>Subtasks &amp; Checklist</span>
                  {subtasksTotal > 0 && (
                    <span className="jira-subtask-counter">
                      {subtasksDone}/{subtasksTotal} ({subtaskProgress}%)
                    </span>
                  )}
                </div>
              </div>

              {subtasksTotal > 0 && (
                <div className="jira-subtask-progressbar">
                  <div
                    className="jira-subtask-progressbar-fill"
                    style={{ width: `${subtaskProgress}%` }}
                  />
                </div>
              )}

              <div className="jira-subtasks-list">
                {subtasks.map((st) => (
                  <div key={st.id} className={`jira-subtask-item ${st.done ? "is-done" : ""}`}>
                    <label className="jira-checkbox-label">
                      <input
                        type="checkbox"
                        checked={st.done}
                        onChange={() => handleToggleSubtask(st.id)}
                        disabled={!canManage}
                      />
                      <span className="jira-subtask-text">{st.text}</span>
                    </label>
                    {canManage && (
                      <button
                        type="button"
                        className="jira-subtask-del"
                        onClick={() => handleDeleteSubtask(st.id)}
                        title="Delete subtask"
                      >
                        <Icon name="close" size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canManage && (
                <form onSubmit={handleAddSubtask} className="jira-subtask-form">
                  <Icon name="plus" size={14} />
                  <input
                    type="text"
                    value={newSubtaskText}
                    onChange={(e) => setNewSubtaskText(e.target.value)}
                    placeholder="Add a checklist item (press Enter)..."
                  />
                  {newSubtaskText.trim() && (
                    <button type="submit" className="btn primary small">
                      Add
                    </button>
                  )}
                </form>
              )}
            </div>

            {/* Activity & Comments Hub */}
            <div className="jira-section jira-activity-hub">
              <div className="jira-activity-tabs">
                <button
                  type="button"
                  className={`jira-tab-btn ${activeTab === "comments" ? "active" : ""}`}
                  onClick={() => setActiveTab("comments")}
                >
                  <Icon name="comment" size={15} />
                  <span>Comments ({comments.length})</span>
                </button>
                <button
                  type="button"
                  className={`jira-tab-btn ${activeTab === "activity" ? "active" : ""}`}
                  onClick={() => setActiveTab("activity")}
                >
                  <Icon name="clock" size={15} />
                  <span>History</span>
                </button>
              </div>

              {activeTab === "comments" && (
                <div className="jira-comments-pane">
                  {/* New comment input */}
                  <form onSubmit={handleAddComment} className="jira-new-comment-box">
                    <Avatar name={me?.name} color={me?.avatarColor} size={32} decorative />
                    <div className="jira-comment-input-shell">
                      <textarea
                        rows={3}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment or update team on progress..."
                      />
                      <div className="jira-comment-bar">
                        <div className="jira-comment-tools">
                          <button
                            type="button"
                            className="jira-emoji-btn"
                            onClick={() => setNewComment((c) => c + " 👍")}
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            className="jira-emoji-btn"
                            onClick={() => setNewComment((c) => c + " 🚀")}
                          >
                            🚀
                          </button>
                          <button
                            type="button"
                            className="jira-emoji-btn"
                            onClick={() => setNewComment((c) => c + " ⚠️")}
                          >
                            ⚠️
                          </button>
                          <button
                            type="button"
                            className="jira-emoji-btn"
                            onClick={() => setNewComment((c) => c + " ✅")}
                          >
                            ✅
                          </button>
                        </div>
                        <button
                          type="submit"
                          className="btn primary small"
                          disabled={submittingComment || !newComment.trim()}
                        >
                          {submittingComment ? <Spinner plain /> : <Icon name="send" size={14} />}
                          <span>Save comment</span>
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Comments list */}
                  {loadingComments ? (
                    <div className="jira-comments-loading">
                      <Spinner plain />
                      <span>Loading comments...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="jira-comments-empty">
                      <Icon name="comment" size={24} />
                      <p>No comments yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="jira-comments-list">
                      {comments.map((c) => {
                        const canDeleteComment =
                          c.authorEmail === me?.email || me?.role === "ADMIN" || canManage;
                        return (
                          <article key={c.id} className="jira-comment-item">
                            <Avatar name={c.authorName} size={32} decorative />
                            <div className="jira-comment-content">
                              <div className="jira-comment-head">
                                <strong>{c.authorName}</strong>
                                <span className="jira-comment-time">
                                  {timeAgo(c.createdAt)}
                                </span>
                                {canDeleteComment && (
                                  <button
                                    type="button"
                                    className="jira-comment-delete"
                                    onClick={() => handleDeleteComment(c.id)}
                                    disabled={deletingCommentId === c.id}
                                    title="Delete comment"
                                  >
                                    <Icon name="trash" size={13} />
                                  </button>
                                )}
                              </div>
                              <p className="jira-comment-text">{c.content}</p>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "activity" && (
                <div className="jira-history-pane">
                  <div className="jira-history-item">
                    <span className="jira-history-dot" />
                    <div className="jira-history-text">
                      <strong>Issue created</strong> by {task.createdByName || "User"}
                      <small>{formatDateTime(task.createdAt)}</small>
                    </div>
                  </div>
                  {task.updatedAt && (
                    <div className="jira-history-item">
                      <span className="jira-history-dot" />
                      <div className="jira-history-text">
                        <strong>Last modified</strong>
                        <small>{formatDateTime(task.updatedAt)}</small>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Jira Attributes Sidebar */}
          <aside className="jira-drawer-sidebar">
            {/* Status Field */}
            <div className="jira-sidebar-group">
              <label className="jira-sidebar-label">Status</label>
              <div className="jira-status-dropdown-wrap">
                <select
                  className={`jira-status-select ${currentStatus.className}`}
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    handleSave({ status: e.target.value });
                  }}
                  disabled={!canManage}
                >
                  {STATUSES.map((st) => (
                    <option key={st.value} value={st.value}>
                      {st.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee Field */}
            <div className="jira-sidebar-group">
              <div className="jira-sidebar-label-row">
                <label className="jira-sidebar-label">Assignee</label>
                {me && String(assigneeId) !== String(me.id) && canManage && (
                  <button
                    type="button"
                    className="jira-link-action"
                    onClick={() => {
                      setAssigneeId(String(me.id));
                      handleSave({ assigneeId: String(me.id) });
                    }}
                  >
                    Assign to me
                  </button>
                )}
              </div>
              <div className="jira-select-with-avatar">
                {assigneeId ? (
                  <Avatar
                    name={members.find((m) => String(m.id) === String(assigneeId))?.name || "Assignee"}
                    size={24}
                    decorative
                  />
                ) : (
                  <span className="jira-unassigned-avatar">
                    <Icon name="user" size={14} />
                  </span>
                )}
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value);
                    handleSave({ assigneeId: e.target.value });
                  }}
                  disabled={!canManage}
                >
                  <option value="">Unassigned</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name} {member.id === me?.id ? "(You)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Priority Field */}
            <div className="jira-sidebar-group">
              <label className="jira-sidebar-label">Priority</label>
              <div className="jira-priority-select-wrap">
                <span className={`jira-priority-icon ${currentPriority.className}`}>
                  <Icon name="flag" size={14} />
                </span>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    handleSave({ priority: e.target.value });
                  }}
                  disabled={!canManage}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Story Points Estimation */}
            <div className="jira-sidebar-group">
              <label className="jira-sidebar-label">Story Points</label>
              <div className="jira-storypoints-chips">
                {STORY_POINTS.map((pts) => (
                  <button
                    type="button"
                    key={pts}
                    className={`jira-point-chip ${storyPoints === pts ? "active" : ""}`}
                    onClick={() => {
                      setStoryPoints(pts);
                      handleSave({ storyPoints: pts });
                    }}
                    disabled={!canManage}
                  >
                    {pts}
                  </button>
                ))}
              </div>
            </div>

            {/* Sprint Placement */}
            <div className="jira-sidebar-group">
              <label className="jira-sidebar-label">Sprint</label>
              <select
                className="jira-sidebar-select"
                value={sprint}
                onChange={(e) => {
                  setSprint(e.target.value);
                  handleSave({ sprint: e.target.value });
                }}
                disabled={!canManage}
              >
                <option value="active">Active Sprint</option>
                <option value="backlog">Product Backlog</option>
              </select>
            </div>

            {/* Due Date Field */}
            <div className="jira-sidebar-group">
              <label className="jira-sidebar-label">Due Date</label>
              <div className="jira-date-input-wrap">
                <Icon name="calendar" size={15} />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    handleSave({ dueDate: e.target.value });
                  }}
                  disabled={!canManage}
                />
              </div>
              {due.label && (
                <span className={`jira-due-hint ${due.className}`}>
                  {due.label}
                </span>
              )}
            </div>

            {/* Labels & Tags */}
            <div className="jira-sidebar-group">
              <div className="jira-sidebar-label-row">
                <label className="jira-sidebar-label">Labels</label>
                {canManage && (
                  <button
                    type="button"
                    className="jira-link-action"
                    onClick={() => setShowTagInput(!showTagInput)}
                  >
                    {showTagInput ? "Close" : "+ Add"}
                  </button>
                )}
              </div>

              <div className="jira-labels-wrap">
                {labels.map((label) => (
                  <span key={label} className="jira-tag-chip">
                    <Icon name="tag" size={11} />
                    <span>{label}</span>
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(label)}
                        title="Remove tag"
                      >
                        <Icon name="close" size={10} />
                      </button>
                    )}
                  </span>
                ))}
                {labels.length === 0 && !showTagInput && (
                  <span className="jira-no-labels">None</span>
                )}
              </div>

              {showTagInput && (
                <div className="jira-tag-picker">
                  <div className="jira-preset-tags">
                    {PRESET_LABELS.map((preset) => (
                      <button
                        type="button"
                        key={preset.name}
                        className={`jira-preset-btn ${labels.includes(preset.name) ? "selected" : ""}`}
                        onClick={() => handleAddLabel(preset.name)}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                  <div className="jira-custom-tag-row">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      placeholder="Custom label..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLabel(newTagInput);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn secondary small"
                      onClick={() => handleAddLabel(newTagInput)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Issue Metadata */}
            <div className="jira-sidebar-meta">
              <div className="jira-meta-row">
                <span>Reporter</span>
                <strong>{task.createdByName || "User"}</strong>
              </div>
              <div className="jira-meta-row">
                <span>Created</span>
                <span>{formatDate(task.createdAt)}</span>
              </div>
              <div className="jira-meta-row">
                <span>Updated</span>
                <span>{timeAgo(task.updatedAt) || "Recently"}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          open
          title="Delete this issue?"
          message={`Are you sure you want to permanently delete TF-${task.id} (${task.title})?`}
          confirmLabel="Delete issue"
          danger
          busy={deleting}
          onCancel={() => !deleting && setPendingDelete(false)}
          onConfirm={handleDeleteTask}
        />
      )}
    </div>
  );
}
