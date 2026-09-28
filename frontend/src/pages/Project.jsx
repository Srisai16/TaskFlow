import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/Avatar";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import TaskCard from "../components/TaskCard";
import JiraIssueDrawer from "../components/JiraIssueDrawer";
import MembersManagerModal from "../components/MembersManagerModal";
import SprintBacklogView from "../components/SprintBacklogView";
import TimelineRoadmapView from "../components/TimelineRoadmapView";
import AnalyticsDashboardView from "../components/AnalyticsDashboardView";
import {
  dueStatus,
  formatDate,
  initials,
  PRIORITIES,
  PRIORITY_META,
  projectAccent,
  STATUS_META,
  STATUSES,
  timeAgo,
} from "../utils/format";
import {
  exportProjectToJSON,
  exportTasksToCSV,
  ISSUE_TYPE_LIST,
  ISSUE_TYPES,
  parseTaskMetadata,
  serializeTaskDescription,
  STORY_POINTS,
} from "../utils/jira";

export default function Project() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Views: "board" | "backlog" | "list" | "timeline" | "analytics"
  const [view, setView] = useState("board");

  // Filters state
  const [filters, setFilters] = useState({
    q: "",
    priority: "",
    assigneeId: "",
    status: "",
    issueType: "",
    overdueOnly: false,
    mineOnly: false,
    bugsOnly: false,
    sortBy: "position",
  });

  // Modal / Drawer states
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState("TODO");
  const [createInitialSprint, setCreateInitialSprint] = useState("active");
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [savingSettings, setSavingSettings] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [movingTaskId, setMovingTaskId] = useState(null);

  // Quick Inline Creation State in Column
  const [inlineCreateColumn, setInlineCreateColumn] = useState(null);
  const [inlineTitle, setInlineTitle] = useState("");

  const canManageProject = Boolean(project?.currentUserIsCreator || user?.role === "ADMIN");
  const canManage = Boolean(project && (canManageProject || members.length > 0));

  // Load project data
  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [projRes, tasksRes, statsRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/dashboard`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members || []);
      setTasks(tasksRes.data || []);
      setStats(statsRes.data || null);
    } catch (err) {
      setLoadError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const target = e.target;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
      if (isInput) return;

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        setCreateInitialStatus("TODO");
        setCreateInitialSprint("active");
        setShowCreateModal(true);
      } else if (e.key === "b" || e.key === "B") {
        setView("board");
      } else if (e.key === "l" || e.key === "L") {
        setView("list");
      }
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Filtered & Sorted tasks
  const visibleTasks = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const { cleanDescription, meta } = parseTaskMetadata(task);

      const matchesQ =
        !q ||
        task.title.toLowerCase().includes(q) ||
        cleanDescription.toLowerCase().includes(q) ||
        meta.issueKey.toLowerCase().includes(q) ||
        meta.labels.some((l) => l.toLowerCase().includes(q));

      const matchesPriority = !filters.priority || task.priority === filters.priority;
      const matchesAssignee = !filters.assigneeId || String(task.assigneeId) === filters.assigneeId;
      const matchesStatus = !filters.status || task.status === filters.status;
      const matchesType = !filters.issueType || meta.issueType === filters.issueType;
      const matchesOverdue =
        !filters.overdueOnly || task.overdue || dueStatus(task.dueDate, task.status).className === "overdue";
      const matchesMine = !filters.mineOnly || String(task.assigneeId) === String(user?.id);
      const matchesBugs = !filters.bugsOnly || meta.issueType === "BUG";

      return (
        matchesQ &&
        matchesPriority &&
        matchesAssignee &&
        matchesStatus &&
        matchesType &&
        matchesOverdue &&
        matchesMine &&
        matchesBugs
      );
    });

    const sorted = [...filtered];
    if (filters.sortBy === "dueDate") {
      sorted.sort((a, b) => (a.dueDate || "9999").localeCompare(b.dueDate || "9999"));
    } else if (filters.sortBy === "priority") {
      sorted.sort(
        (a, b) => (PRIORITY_META[b.priority]?.weight || 0) - (PRIORITY_META[a.priority]?.weight || 0)
      );
    } else if (filters.sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => (a.position || 0) - (b.position || 0));
    }

    return sorted;
  }, [filters, tasks, user]);

  // Grouped tasks for Kanban board
  const kanbanColumns = useMemo(() => {
    const groups = {
      TODO: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      DONE: [],
    };
    visibleTasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });
    return groups;
  }, [visibleTasks]);

  // Move task to a new status
  const handleMoveStatus = async (task, targetStatus) => {
    if (movingTaskId || task.status === targetStatus) return;
    setMovingTaskId(task.id);
    try {
      const response = await api.patch(`/projects/${id}/tasks/${task.id}/status`, {
        status: targetStatus,
      });
      setTasks((curr) => curr.map((t) => (t.id === task.id ? response.data : t)));
      toast.success(`Moved to ${STATUS_META[targetStatus]?.label}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMovingTaskId(null);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnStatus) {
      setDragOverColumn(columnStatus);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const taskIdString = e.dataTransfer.getData("text/plain");
    if (!taskIdString) return;
    const task = tasks.find((t) => String(t.id) === taskIdString);
    if (task && task.status !== targetStatus) {
      handleMoveStatus(task, targetStatus);
    }
  };

  // Inline Quick Create in Column
  const handleInlineCreate = async (e, colStatus) => {
    e.preventDefault();
    if (!inlineTitle.trim()) return;
    const payload = {
      title: inlineTitle.trim(),
      description: serializeTaskDescription("", {
        issueType: inlineTitle.toLowerCase().includes("bug") ? "BUG" : "TASK",
        storyPoints: 2,
        sprint: "active",
        labels: [],
        subtasks: [],
      }),
      status: colStatus,
      priority: "MEDIUM",
      assigneeId: user?.id || null,
      dueDate: null,
      position: tasks.length + 1,
    };

    try {
      const { data } = await api.post(`/projects/${id}/tasks`, payload);
      setTasks((curr) => [...curr, data]);
      setInlineTitle("");
      setInlineCreateColumn(null);
      toast.success("Issue created");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  // Project Settings Save
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!projectForm.name.trim()) return;
    setSavingSettings(true);
    try {
      const response = await api.put(`/projects/${id}`, {
        name: projectForm.name.trim(),
        description: projectForm.description.trim() || null,
      });
      setProject(response.data);
      setShowSettingsModal(false);
      toast.success("Project settings saved");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <main className="page page-loading-state">
        <div className="page-loading-card">
          <Spinner plain />
          <div>
            <strong>Opening Jira Workspace</strong>
            <span>Synchronizing agile board and team sprints...</span>
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="page">
        <div className="state-card error-state">
          <Icon name="alert" size={24} />
          <div>
            <h1>Project Unavailable</h1>
            <p>{loadError || "This project may have been removed or you may lack permissions."}</p>
          </div>
          <Link to="/" className="btn secondary">
            <Icon name="arrowLeft" size={16} /> Back to Projects
          </Link>
        </div>
      </main>
    );
  }

  const hasActiveFilters = Boolean(
    filters.q ||
      filters.priority ||
      filters.assigneeId ||
      filters.status ||
      filters.issueType ||
      filters.overdueOnly ||
      filters.mineOnly ||
      filters.bugsOnly ||
      filters.sortBy !== "position"
  );

  const clearFilters = () => {
    setFilters({
      q: "",
      priority: "",
      assigneeId: "",
      status: "",
      issueType: "",
      overdueOnly: false,
      mineOnly: false,
      bugsOnly: false,
      sortBy: "position",
    });
  };

  return (
    <main id="main-content" className="page jira-workspace-page" tabIndex={-1}>
      {/* Breadcrumb Navigation */}
      <nav className="jira-breadcrumb" aria-label="Breadcrumb">
        <Link to="/">
          <Icon name="folder" size={14} />
          <span>Projects</span>
        </Link>
        <Icon name="chevronRight" size={13} />
        <span className="jira-breadcrumb-current">{project.name}</span>
      </nav>

      {/* Modern Jira Workspace Header */}
      <header className="jira-header" style={{ "--project-accent": projectAccent(project.id) }}>
        <div className="jira-header-left">
          <span className="jira-header-avatar">{initials(project.name)}</span>
          <div className="jira-header-info">
            <div className="jira-header-badge-row">
              <span className="jira-badge-pill">Agile Project</span>
              <span className="jira-meta-owned">
                <Icon name="user" size={13} /> Owned by {project.createdByName}
              </span>
            </div>
            <h1>{project.name}</h1>
            <p>{project.description || "Agile sprints, backlog planning, and team delivery."}</p>
          </div>
        </div>

        <div className="jira-header-right">
          {/* Member stack preview */}
          <div
            className="jira-member-stack"
            onClick={() => setShowMembersModal(true)}
            role="button"
            tabIndex={0}
            title="Manage Team Members"
          >
            {members.slice(0, 4).map((m) => (
              <Avatar key={m.id} name={m.name} size={28} decorative />
            ))}
            {members.length > 4 && (
              <span className="jira-member-more">+{members.length - 4}</span>
            )}
          </div>

          <button
            type="button"
            className="btn secondary"
            onClick={() => setShowMembersModal(true)}
          >
            <Icon name="users" size={16} />
            <span>Team ({members.length})</span>
          </button>

          {canManageProject && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => {
                setProjectForm({
                  name: project.name,
                  description: project.description || "",
                });
                setShowSettingsModal(true);
              }}
              title="Project Settings"
            >
              <Icon name="settings" size={17} />
            </button>
          )}

          {canManage && (
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                setCreateInitialStatus("TODO");
                setCreateInitialSprint("active");
                setShowCreateModal(true);
              }}
            >
              <Icon name="plus" size={17} />
              <span>Create Issue</span>
              <kbd className="jira-key-hint">C</kbd>
            </button>
          )}
        </div>
      </header>

      {/* Jira Views Navigation Bar */}
      <nav className="jira-view-tabs" role="tablist" aria-label="Project views">
        <button
          type="button"
          role="tab"
          aria-selected={view === "board"}
          className={`jira-tab-item ${view === "board" ? "active" : ""}`}
          onClick={() => setView("board")}
        >
          <Icon name="columns" size={15} />
          <span>Kanban Board</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "backlog"}
          className={`jira-tab-item ${view === "backlog" ? "active" : ""}`}
          onClick={() => setView("backlog")}
        >
          <Icon name="layers" size={15} />
          <span>Backlog &amp; Sprints</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "list"}
          className={`jira-tab-item ${view === "list" ? "active" : ""}`}
          onClick={() => setView("list")}
        >
          <Icon name="table" size={15} />
          <span>Table View</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "timeline"}
          className={`jira-tab-item ${view === "timeline" ? "active" : ""}`}
          onClick={() => setView("timeline")}
        >
          <Icon name="calendar" size={15} />
          <span>Roadmap Timeline</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={view === "analytics"}
          className={`jira-tab-item ${view === "analytics" ? "active" : ""}`}
          onClick={() => setView("analytics")}
        >
          <Icon name="barChart" size={15} />
          <span>Insights &amp; Reports</span>
        </button>
      </nav>

      {/* Filter & Search Toolbar (shown for Board, Backlog, and List views) */}
      {(view === "board" || view === "list") && (
        <div className="jira-filter-toolbar">
          <div className="jira-search-box">
            <Icon name="search" size={16} />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilters((curr) => ({ ...curr, q: e.target.value }))}
              placeholder="Search by summary, key (TF-1), tag..."
            />
            {filters.q && (
              <button
                type="button"
                onClick={() => setFilters((curr) => ({ ...curr, q: "" }))}
              >
                <Icon name="close" size={13} />
              </button>
            )}
          </div>

          <div className="jira-quick-filters">
            <button
              type="button"
              className={`jira-quick-btn ${filters.mineOnly ? "active" : ""}`}
              onClick={() => setFilters((c) => ({ ...c, mineOnly: !c.mineOnly }))}
            >
              <Icon name="user" size={13} />
              <span>Only My Issues</span>
            </button>

            <button
              type="button"
              className={`jira-quick-btn ${filters.bugsOnly ? "active" : ""}`}
              onClick={() => setFilters((c) => ({ ...c, bugsOnly: !c.bugsOnly }))}
            >
              <Icon name="alert" size={13} />
              <span>Bugs</span>
            </button>

            <button
              type="button"
              className={`jira-quick-btn ${filters.overdueOnly ? "active" : ""}`}
              onClick={() => setFilters((c) => ({ ...c, overdueOnly: !c.overdueOnly }))}
            >
              <Icon name="clock" size={13} />
              <span>Overdue</span>
            </button>
          </div>

          <div className="jira-select-filters">
            {/* Priority filter */}
            <div className="jira-filter-dropdown">
              <Icon name="flag" size={14} />
              <select
                value={filters.priority}
                onChange={(e) => setFilters((c) => ({ ...c, priority: e.target.value }))}
              >
                <option value="">Priority: All</option>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Type filter */}
            <div className="jira-filter-dropdown">
              <Icon name="bookmark" size={14} />
              <select
                value={filters.issueType}
                onChange={(e) => setFilters((c) => ({ ...c, issueType: e.target.value }))}
              >
                <option value="">Type: All</option>
                {ISSUE_TYPE_LIST.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignee filter */}
            <div className="jira-filter-dropdown">
              <Icon name="user" size={14} />
              <select
                value={filters.assigneeId}
                onChange={(e) => setFilters((c) => ({ ...c, assigneeId: e.target.value }))}
              >
                <option value="">Assignee: All</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort filter */}
            <div className="jira-filter-dropdown">
              <Icon name="sort" size={14} />
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters((c) => ({ ...c, sortBy: e.target.value }))}
              >
                <option value="position">Sort: Board Order</option>
                <option value="dueDate">Sort: Due Date</option>
                <option value="priority">Sort: Priority</option>
                <option value="title">Sort: Title</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="jira-clear-btn"
                onClick={clearFilters}
              >
                <Icon name="close" size={13} />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 1: KANBAN BOARD */}
      {view === "board" && (
        <div className="jira-kanban-board">
          {STATUSES.map((column) => {
            const colTasks = kanbanColumns[column.value] || [];
            const isDragOver = dragOverColumn === column.value;
            const isInlineActive = inlineCreateColumn === column.value;

            return (
              <section
                key={column.value}
                className={`jira-board-column ${column.className} ${isDragOver ? "is-drag-over" : ""}`}
                onDragOver={(e) => handleDragOver(e, column.value)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.value)}
              >
                <header className="jira-col-head">
                  <div className="jira-col-title-line">
                    <span className="jira-col-indicator" />
                    <h3>{column.label}</h3>
                    <span className="jira-col-count">{colTasks.length}</span>
                  </div>

                  {canManage && (
                    <button
                      type="button"
                      className="jira-col-add-btn"
                      onClick={() => {
                        setInlineCreateColumn(isInlineActive ? null : column.value);
                        setInlineTitle("");
                      }}
                      title={`Quick create in ${column.label}`}
                    >
                      <Icon name={isInlineActive ? "close" : "plus"} size={14} />
                    </button>
                  )}
                </header>

                {/* Inline Quick Add Form in Column */}
                {isInlineActive && (
                  <form
                    className="jira-inline-add-card"
                    onSubmit={(e) => handleInlineCreate(e, column.value)}
                  >
                    <input
                      type="text"
                      value={inlineTitle}
                      onChange={(e) => setInlineTitle(e.target.value)}
                      placeholder="What needs to be done?"
                      autoFocus
                    />
                    <div className="jira-inline-actions">
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => setInlineCreateColumn(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn primary small"
                        disabled={!inlineTitle.trim()}
                      >
                        Add Issue
                      </button>
                    </div>
                  </form>
                )}

                <div className="jira-col-cards-container">
                  {colTasks.length === 0 && !isInlineActive ? (
                    <div className="jira-col-empty">
                      <span>No issues</span>
                    </div>
                  ) : (
                    colTasks.map((task) => {
                      const nextStatus = STATUS_META[task.status]?.next;
                      return (
                        <TaskCard
                          key={task.id}
                          task={task}
                          canManage={canManage}
                          moving={movingTaskId === task.id}
                          onOpen={() => setActiveTaskId(task.id)}
                          onMove={
                            nextStatus ? () => handleMoveStatus(task, nextStatus) : null
                          }
                          moveLabel={nextStatus ? STATUS_META[nextStatus].label : ""}
                        />
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* VIEW 2: SPRINT & BACKLOG */}
      {view === "backlog" && (
        <SprintBacklogView
          tasks={tasks}
          members={members}
          canManage={canManage}
          onOpenTask={setActiveTaskId}
          onUpdateTask={async (taskId, updatedData) => {
            try {
              const { data } = await api.put(
                `/projects/${id}/tasks/${taskId}`,
                updatedData
              );
              setTasks((curr) => curr.map((t) => (t.id === taskId ? data : t)));
              toast.success("Issue updated");
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }}
          onCreateTask={async (taskData) => {
            const payload = {
              title: taskData.title,
              description: serializeTaskDescription("", {
                issueType: "TASK",
                storyPoints: 2,
                sprint: taskData.sprint || "active",
                labels: [],
                subtasks: [],
              }),
              status: taskData.status || "TODO",
              priority: "MEDIUM",
              assigneeId: null,
              dueDate: null,
              position: tasks.length + 1,
            };
            try {
              const { data } = await api.post(`/projects/${id}/tasks`, payload);
              setTasks((curr) => [...curr, data]);
              toast.success("Issue created");
            } catch (err) {
              toast.error(getErrorMessage(err));
            }
          }}
        />
      )}

      {/* VIEW 3: TABLE / LIST SPREADSHEET */}
      {view === "list" && (
        <div className="jira-table-view">
          <div className="jira-table-shell">
            <div className="jira-table-head">
              <span className="jira-th key">Key</span>
              <span className="jira-th title">Summary</span>
              <span className="jira-th status">Status</span>
              <span className="jira-th priority">Priority</span>
              <span className="jira-th assignee">Assignee</span>
              <span className="jira-th points">Points</span>
              <span className="jira-th due">Due Date</span>
              <span className="jira-th actions">Actions</span>
            </div>

            <div className="jira-table-body">
              {visibleTasks.length === 0 ? (
                <div className="jira-table-empty">
                  <Icon name="search" size={24} />
                  <p>No issues match your filters.</p>
                </div>
              ) : (
                visibleTasks.map((task) => {
                  const { meta } = parseTaskMetadata(task);
                  const issueType = ISSUE_TYPES[meta.issueType] || ISSUE_TYPES.TASK;
                  const statusObj = STATUS_META[task.status] || STATUS_META.TODO;
                  const priorityObj = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
                  const due = dueStatus(task.dueDate, task.status);

                  return (
                    <div
                      key={task.id}
                      className="jira-table-row"
                      onClick={() => setActiveTaskId(task.id)}
                    >
                      <span className="jira-td key">
                        <span
                          className="jira-type-badge small"
                          style={{ color: issueType.color, backgroundColor: issueType.bg }}
                        >
                          <Icon name={issueType.icon} size={12} />
                        </span>
                        <strong>{meta.issueKey}</strong>
                      </span>

                      <span className="jira-td title">
                        <strong>{task.title}</strong>
                        {meta.labels.map((l) => (
                          <span key={l} className="jira-tag-chip small">
                            {l}
                          </span>
                        ))}
                      </span>

                      <span className="jira-td status">
                        <span className={`status-pill ${statusObj.className}`}>
                          <i />
                          {statusObj.label}
                        </span>
                      </span>

                      <span className="jira-td priority">
                        <span className={`priority ${priorityObj.className}`}>
                          <Icon name="flag" size={12} />
                          {priorityObj.label}
                        </span>
                      </span>

                      <span className="jira-td assignee">
                        {task.assigneeName ? (
                          <>
                            <Avatar
                              name={task.assigneeName}
                              color={task.assigneeAvatarColor}
                              size={22}
                              decorative
                            />
                            <span>{task.assigneeName}</span>
                          </>
                        ) : (
                          <span className="unassigned-text">Unassigned</span>
                        )}
                      </span>

                      <span className="jira-td points">
                        <span className="jira-points-badge">{meta.storyPoints || 0}</span>
                      </span>

                      <span className="jira-td due">
                        <span className={`jira-due-pill ${due.className}`}>
                          {due.label || "—"}
                        </span>
                      </span>

                      <span className="jira-td actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="icon-btn small"
                          onClick={() => setActiveTaskId(task.id)}
                          title="Open Issue Drawer"
                        >
                          <Icon name="arrowUpRight" size={14} />
                        </button>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: TIMELINE ROADMAP */}
      {view === "timeline" && (
        <TimelineRoadmapView tasks={tasks} onOpenTask={setActiveTaskId} />
      )}

      {/* VIEW 5: ANALYTICS & INSIGHTS */}
      {view === "analytics" && (
        <AnalyticsDashboardView
          project={project}
          tasks={tasks}
          stats={stats}
          members={members}
          onOpenTask={setActiveTaskId}
        />
      )}

      {/* JIRA ISSUE DRAWER (FULL SCREEN / MODAL) */}
      {activeTaskId && (
        <JiraIssueDrawer
          projectId={id}
          taskId={activeTaskId}
          tasks={tasks}
          members={members}
          me={user}
          canManage={canManage}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={(updatedTask) => {
            setTasks((curr) => curr.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
          }}
          onTaskDeleted={(deletedId) => {
            setTasks((curr) => curr.filter((t) => t.id !== deletedId));
            setActiveTaskId(null);
          }}
        />
      )}

      {/* CREATE ISSUE MODAL */}
      {showCreateModal && (
        <CreateIssueModal
          projectId={id}
          members={members}
          initialStatus={createInitialStatus}
          initialSprint={createInitialSprint}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newTask) => {
            setTasks((curr) => [...curr, newTask]);
            setShowCreateModal(false);
            toast.success("New issue created!");
          }}
        />
      )}

      {/* TEAM DIRECTORY & MEMBER MANAGEMENT MODAL */}
      {showMembersModal && (
        <MembersManagerModal
          projectId={id}
          project={project}
          members={members}
          tasks={tasks}
          currentUser={user}
          canManageProject={canManageProject}
          onClose={() => setShowMembersModal(false)}
          onMembersUpdated={load}
          onTasksReassigned={load}
        />
      )}

      {/* PROJECT SETTINGS MODAL */}
      {showSettingsModal && canManageProject && (
        <Modal
          title="Project Settings"
          description="Update workspace configuration and project metadata."
          onClose={() => setShowSettingsModal(false)}
        >
          <form className="jira-settings-form" onSubmit={handleSaveSettings}>
            <div className="form-field">
              <label>Project Name</label>
              <input
                type="text"
                value={projectForm.name}
                onChange={(e) => setProjectForm((c) => ({ ...c, name: e.target.value }))}
                required
              />
            </div>

            <div className="form-field">
              <label>Description &amp; Goals</label>
              <textarea
                rows={4}
                value={projectForm.description}
                onChange={(e) => setProjectForm((c) => ({ ...c, description: e.target.value }))}
                placeholder="What is this project delivering?"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setShowSettingsModal(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn primary"
                disabled={savingSettings || !projectForm.name.trim()}
              >
                {savingSettings ? <Spinner plain /> : <Icon name="check" size={15} />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}

/**
 * Quick Create Issue Modal
 */
function CreateIssueModal({ projectId, members, initialStatus, initialSprint, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("TASK");
  const [priority, setPriority] = useState("MEDIUM");
  const [status, setStatus] = useState(initialStatus || "TODO");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [storyPoints, setStoryPoints] = useState(2);
  const [subtasksText, setSubtasksText] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    setError("");

    const subtasks = subtasksText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text, idx) => ({ id: Date.now() + idx, text, done: false }));

    const payloadDescription = serializeTaskDescription(description.trim(), {
      issueType,
      storyPoints: Number(storyPoints) || 0,
      sprint: initialSprint || "active",
      labels: [],
      subtasks,
    });

    const payload = {
      title: title.trim(),
      description: payloadDescription,
      status,
      priority,
      assigneeId: assigneeId ? Number(assigneeId) : null,
      dueDate: dueDate || null,
      position: 9999,
    };

    try {
      const response = await api.post(`/projects/${projectId}/tasks`, payload);
      onCreated(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal
      title="Create Issue"
      description="Add a new story, bug, task, or epic to your agile workspace."
      onClose={onClose}
    >
      <form className="jira-create-form" onSubmit={handleSubmit}>
        {error && (
          <div className="alert error">
            <Icon name="alert" size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="jira-form-row-2">
          <div className="form-field">
            <label>Issue Type</label>
            <select value={issueType} onChange={(e) => setIssueType(e.target.value)}>
              {ISSUE_TYPE_LIST.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>Summary / Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Implement OAuth token refresh flow"
            required
            autoFocus
          />
        </div>

        <div className="form-field">
          <label>Description</label>
          <textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what needs to be built or fixed..."
          />
        </div>

        <div className="jira-form-row-3">
          <div className="form-field">
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Story Points</label>
            <select value={storyPoints} onChange={(e) => setStoryPoints(Number(e.target.value))}>
              {STORY_POINTS.map((pts) => (
                <option key={pts} value={pts}>
                  {pts} Points
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label>Assignee</label>
            <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-field">
          <label>Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="form-field">
          <label>Checklist / Subtasks (1 item per line)</label>
          <textarea
            rows={3}
            value={subtasksText}
            onChange={(e) => setSubtasksText(e.target.value)}
            placeholder="Step 1: Write integration test&#10;Step 2: Update controller&#10;Step 3: Verify frontend"
          />
        </div>

        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={creating || !title.trim()}>
            {creating ? <Spinner plain /> : <Icon name="plus" size={16} />}
            <span>{creating ? "Creating..." : "Create Issue"}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
}
