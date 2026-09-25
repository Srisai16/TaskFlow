import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Avatar from "../components/Avatar";
import CommentsModal from "../components/CommentsModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import TaskCard from "../components/TaskCard";
import TaskFormModal from "../components/TaskFormModal";
import {
  dueStatus,
  formatDate,
  initials,
  PRIORITY_META,
  PRIORITIES,
  projectAccent,
  STATUSES,
  STATUS_META,
  timeAgo,
} from "../utils/format";

function roleLabel(role) {
  if (!role) return "Member";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function TaskList({ tasks, canManage, groupBy, onOpen, onMove, movingTaskId, selectedTaskIds, onToggle, onToggleAll, onBulkMove, bulkMoving }) {
  const allSelected = tasks.length > 0 && tasks.every((task) => selectedTaskIds.includes(task.id));
  const taskGroups = useMemo(() => {
    if (!groupBy || groupBy === "none") return [{ key: "all", label: "", tasks }];
    if (groupBy === "status") {
      return STATUSES.map((status) => ({ key: status.value, label: status.label, tasks: tasks.filter((task) => task.status === status.value) })).filter((group) => group.tasks.length);
    }
    if (groupBy === "priority") {
      return PRIORITIES.map((priority) => ({ key: priority.value, label: `${priority.label} priority`, tasks: tasks.filter((task) => task.priority === priority.value) })).filter((group) => group.tasks.length);
    }
    const assignees = [...new Map(tasks.map((task) => [task.assigneeId || "unassigned", { id: task.assigneeId || "unassigned", name: task.assigneeName || "Unassigned" }])).values()];
    return assignees.map((assignee) => ({ key: assignee.id, label: assignee.name, tasks: tasks.filter((task) => String(task.assigneeId || "unassigned") === String(assignee.id)) }));
  }, [groupBy, tasks]);

  const renderTask = (task) => {
    const status = STATUS_META[task.status] || STATUS_META.TODO;
    const priority = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
    const due = dueStatus(task.dueDate, task.status);
    const nextStatus = status.next;
    return (
      <div className={`task-list-row ${selectedTaskIds.includes(task.id) ? "selected" : ""}`} key={task.id} role="row">
        <span role="cell"><input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={() => onToggle(task.id)} disabled={!canManage} aria-label={`Select ${task.title}`} /></span>
        <span role="cell" className="task-list-task-cell"><button type="button" className="task-list-task" onClick={() => onOpen(task.id)}><strong>{task.title}</strong><small>{task.description || "No description"}</small></button></span>
        <span role="cell"><span className={`status-pill ${status.className}`}><i />{status.label}</span></span>
        <span role="cell"><span className={`priority ${priority.className}`}><i />{priority.label}</span></span>
        <span role="cell" className="task-list-assignee">{task.assigneeName ? <><Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={26} decorative /><span>{task.assigneeName}</span></> : <><span className="unassigned-dot" />Unassigned</>}</span>
        <span role="cell"><span className={`list-due ${due.className}`}><Icon name="calendar" size={14} />{due.label || "—"}</span></span>
        <span role="cell" className="task-list-actions">{canManage && nextStatus && <button type="button" className="icon-btn" onClick={() => onMove(task, nextStatus)} disabled={movingTaskId === task.id || bulkMoving} aria-label={`Move ${task.title} to ${STATUS_META[nextStatus].label}`} title={`Move to ${STATUS_META[nextStatus].label}`}>{movingTaskId === task.id ? <span className="mini-spinner" /> : <Icon name="arrowRight" size={15} />}</button>}<button type="button" className="icon-btn" onClick={() => onOpen(task.id)} aria-label={`Open ${task.title}`}><Icon name="arrowUpRight" size={15} /></button></span>
      </div>
    );
  };

  return (
    <section className="task-list-section" aria-labelledby="task-list-title">
      <div className="task-list-heading">
        <div><span className="eyebrow"><Icon name="layers" size={14} /> Work queue</span><h2 id="task-list-title">List view</h2><p>Review, triage, and move work without losing the board context.</p></div>
        {canManage && tasks.length > 0 && <span className="list-selection-hint">Select rows for bulk actions</span>}
      </div>
      {selectedTaskIds.length > 0 && canManage && (
        <div className="bulk-action-bar" role="toolbar" aria-label="Bulk task actions">
          <strong>{selectedTaskIds.length} selected</strong>
          <span>Move to</span>
          <button type="button" className="btn secondary small" onClick={() => onBulkMove("IN_PROGRESS")} disabled={bulkMoving}>In progress</button>
          <button type="button" className="btn secondary small" onClick={() => onBulkMove("IN_REVIEW")} disabled={bulkMoving}>In review</button>
          <button type="button" className="btn secondary small" onClick={() => onBulkMove("DONE")} disabled={bulkMoving}>Done</button>
          {bulkMoving && <span className="mini-spinner" aria-label="Updating tasks" />}
        </div>
      )}
      <div className="task-list-table" role="table" aria-label="Project tasks">
        <div className="task-list-row task-list-header" role="row">
          <span role="columnheader"><input type="checkbox" checked={allSelected} onChange={onToggleAll} disabled={!tasks.length || !canManage} aria-label="Select all visible tasks" /></span>
          <span role="columnheader">Task</span>
          <span role="columnheader">Status</span>
          <span role="columnheader">Priority</span>
          <span role="columnheader">Assignee</span>
          <span role="columnheader">Due date</span>
          <span role="columnheader" />
        </div>
        {tasks.length ? taskGroups.map((group) => (
          <div className="task-list-group" key={group.key}>
            {group.label && <div className="task-list-group-head"><span>{group.label}</span><em>{group.tasks.length}</em></div>}
            {group.tasks.map(renderTask)}
          </div>
        )) : <div className="task-list-empty"><Icon name="search" size={22} /><strong>No tasks match these filters</strong><span>Clear a filter or create a new task to get moving.</span></div>}
      </div>
    </section>
  );
}

function ProjectInsights({ project, tasks, stats, members, user, onOpen }) {
  const priorityData = PRIORITIES.map((priority) => {
    const count = Number(stats?.tasksByPriority?.[priority.value] || tasks.filter((task) => task.priority === priority.value).length);
    return { ...priority, count };
  });
  const maxPriority = Math.max(1, ...priorityData.map((item) => item.count));
  const workload = members.map((member) => {
    const assigned = tasks.filter((task) => String(task.assigneeId) === String(member.id));
    const completed = assigned.filter((task) => task.status === "DONE").length;
    return { ...member, assigned: assigned.length, completed, open: assigned.length - completed };
  }).sort((first, second) => second.assigned - first.assigned);
  const recent = [...tasks].sort((first, second) => new Date(second.updatedAt || 0) - new Date(first.updatedAt || 0)).slice(0, 6);
  const risk = tasks.filter((task) => task.overdue || (!task.assigneeId && task.status !== "DONE")).slice(0, 6);

  return (
    <section className="insights-section" aria-labelledby="insights-title">
      <div className="insights-heading"><div><span className="eyebrow"><Icon name="target" size={14} /> Delivery intelligence</span><h2 id="insights-title">Project insights</h2><p>Understand flow, focus, and where the next decision will have the most impact.</p></div><span className="insights-updated">Live from {project.name}</span></div>
      <div className="insights-grid">
        <article className="insight-card priority-insight"><div className="insight-card-head"><div><strong>Priority mix</strong><span>Where the work is concentrated</span></div><span className="insight-card-icon purple"><Icon name="flag" size={17} /></span></div><div className="priority-bars">{priorityData.map((item) => <div className="priority-bar-row" key={item.value}><div><span className={`priority ${item.className}`}><i />{item.label}</span><strong>{item.count}</strong></div><div className="insight-bar"><span style={{ width: `${(item.count / maxPriority) * 100}%` }} /></div></div>)}</div></article>
        <article className="insight-card workload-insight"><div className="insight-card-head"><div><strong>Team workload</strong><span>Assigned work by teammate</span></div><span className="insight-card-icon cyan"><Icon name="users" size={17} /></span></div><div className="workload-list">{workload.length ? workload.slice(0, 5).map((member) => <div className="workload-row" key={member.id}><Avatar name={member.name} color={member.avatarColor} size={28} decorative /><div><strong>{String(member.id) === String(user?.id) ? "You" : member.name}</strong><span>{member.open} open · {member.completed} done</span></div><div className="workload-meter"><span style={{ width: `${member.assigned ? Math.max(12, (member.assigned / Math.max(1, workload[0].assigned)) * 100) : 0}%` }} /></div></div>) : <div className="insight-empty">No members have assigned work yet.</div>}</div></article>
        <article className="insight-card risk-insight"><div className="insight-card-head"><div><strong>Needs a decision</strong><span>Overdue or unassigned work</span></div><span className="insight-card-icon red"><Icon name="alert" size={17} /></span></div>{risk.length ? <div className="risk-list">{risk.map((task) => <button type="button" key={task.id} onClick={() => onOpen(task.id)}><span className={`risk-dot ${task.overdue ? "overdue" : "unassigned"}`} /><span><strong>{task.title}</strong><small>{task.overdue ? "Overdue" : "Unassigned"}</small></span><Icon name="chevronRight" size={14} /></button>)}</div> : <div className="insight-empty"><Icon name="checkCircle" size={18} />No blocked work detected.</div>}</article>
        <article className="insight-card activity-insight"><div className="insight-card-head"><div><strong>Recent activity</strong><span>Latest task updates</span></div><span className="insight-card-icon blue"><Icon name="clock" size={17} /></span></div>{recent.length ? <div className="activity-list">{recent.map((task) => <button type="button" key={task.id} onClick={() => onOpen(task.id)}><span className="activity-line" /><span><strong>{task.title}</strong><small>{task.updatedAt ? `Updated ${formatDate(task.updatedAt)}` : "Recently updated"}</small></span></button>)}</div> : <div className="insight-empty">Task activity will appear here.</div>}</article>
      </div>
    </section>
  );
}

export default function Project() {
  const { id } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [nextDue, setNextDue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState({ q: "", priority: "", assigneeId: "", status: "", overdueOnly: false, mineOnly: false, groupBy: "none", sortBy: "position" });
  const [view, setView] = useState("board");
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkMoving, setBulkMoving] = useState(false);
  const [createStatus, setCreateStatus] = useState(null);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [savingTask, setSavingTask] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [movingTaskId, setMovingTaskId] = useState(null);
  const [pendingTaskDelete, setPendingTaskDelete] = useState(null);
  const [deletingTask, setDeletingTask] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberError, setMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [pendingMemberRemoval, setPendingMemberRemoval] = useState(null);
  const [removingMember, setRemovingMember] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingProject, setSavingProject] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: "", description: "" });
  const [projectError, setProjectError] = useState("");

  const canManageProject = Boolean(project?.currentUserIsCreator || user?.role === "ADMIN");
  const canManage = Boolean(project && (canManageProject || members.length > 0));
  const editingTask = tasks.find((task) => task.id === editingTaskId) || null;
  const activeTask = useMemo(
    () => tasks.find((task) => task.id === activeTaskId) || nextDue.find((task) => task.id === activeTaskId) || null,
    [activeTaskId, nextDue, tasks]
  );

  const updateCommentCount = useCallback((taskId, commentCount) => {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, commentCount } : task)));
    setNextDue((current) => current.map((task) => (task.id === taskId ? { ...task, commentCount } : task)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setProject(null);
    try {
      const [projectResponse, tasksResponse, statsResponse, nextDueResponse] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/projects/${id}/tasks`),
        api.get(`/projects/${id}/dashboard`),
        api.get(`/projects/${id}/tasks/next-due?limit=6`),
      ]);
      setProject(projectResponse.data.project);
      setMembers(projectResponse.data.members || []);
      setTasks(tasksResponse.data);
      setStats(statsResponse.data);
      setNextDue(nextDueResponse.data);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    setFilters({ q: "", priority: "", assigneeId: "", status: "", overdueOnly: false, mineOnly: false, groupBy: "none", sortBy: "position" });
    setSelectedTaskIds([]);
    setCreateStatus(null);
    setEditingTaskId(null);
    setActiveTaskId(null);
    setShowMembers(false);
  }, [load]);

  const visibleTasks = useMemo(() => {
    const query = filters.q.trim().toLowerCase();
    const filtered = tasks.filter((task) => {
      const matchesQuery = !query || task.title.toLowerCase().includes(query) || (task.description || "").toLowerCase().includes(query);
      const matchesPriority = !filters.priority || task.priority === filters.priority;
      const matchesAssignee = !filters.assigneeId || String(task.assigneeId) === filters.assigneeId;
      const matchesStatus = !filters.status || task.status === filters.status;
      const matchesOverdue = !filters.overdueOnly || task.overdue || dueStatus(task.dueDate, task.status).className === "overdue";
      const matchesMine = !filters.mineOnly || String(task.assigneeId) === String(user?.id);
      return matchesQuery && matchesPriority && matchesAssignee && matchesStatus && matchesOverdue && matchesMine;
    });
    const sorted = [...filtered];
    if (filters.sortBy === "dueDate") {
      sorted.sort((first, second) => {
        if (!first.dueDate) return 1;
        if (!second.dueDate) return -1;
        return first.dueDate.localeCompare(second.dueDate);
      });
    } else if (filters.sortBy === "priority") {
      sorted.sort((first, second) => (PRIORITY_META[second.priority]?.weight || 0) - (PRIORITY_META[first.priority]?.weight || 0));
    } else if (filters.sortBy === "title") {
      sorted.sort((first, second) => first.title.localeCompare(second.title));
    } else {
      sorted.sort((first, second) => (first.position || 0) - (second.position || 0));
    }
    return sorted;
  }, [filters, tasks, user]);

  const groupedTasks = useMemo(() => {
    const groups = Object.fromEntries(STATUSES.map((status) => [status.value, []]));
    visibleTasks.forEach((task) => {
      if (groups[task.status]) groups[task.status].push(task);
    });
    return groups;
  }, [visibleTasks]);

  const refreshStats = useCallback(() => {
    Promise.all([
      api.get(`/projects/${id}/dashboard`),
      api.get(`/projects/${id}/tasks/next-due?limit=6`),
    ])
      .then(([statsResponse, nextDueResponse]) => {
        setStats(statsResponse.data);
        setNextDue(nextDueResponse.data);
      })
      .catch(() => {});
  }, [id]);

  const moveTask = async (task, status) => {
    if (movingTaskId) return;
    setMovingTaskId(task.id);
    try {
      const { data } = await api.patch(`/projects/${id}/tasks/${task.id}/status`, { status });
      setTasks((current) => current.map((item) => (item.id === data.id ? data : item)));
      refreshStats();
      toast.success(`“${task.title}” moved to ${STATUS_META[status].label}.`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setMovingTaskId(null);
    }
  };

  const saveTask = async (payload) => {
    setSavingTask(true);
    setTaskError("");
    try {
      const url = `/projects/${id}/tasks${editingTask ? `/${editingTask.id}` : ""}`;
      const request = editingTask ? api.put(url, payload) : api.post(url, payload);
      const { data } = await request;
      setTasks((current) => editingTask
        ? current.map((task) => (task.id === data.id ? data : task))
        : [...current, data]
      );
      setCreateStatus(null);
      setEditingTaskId(null);
      refreshStats();
      toast.success(editingTask ? "Task updated." : "Task created.");
      return true;
    } catch (error) {
      setTaskError(getErrorMessage(error));
      return false;
    } finally {
      setSavingTask(false);
    }
  };

  const deleteTask = async () => {
    if (!pendingTaskDelete) return;
    setDeletingTask(true);
    try {
      await api.delete(`/projects/${id}/tasks/${pendingTaskDelete.id}`);
      setTasks((current) => current.filter((task) => task.id !== pendingTaskDelete.id));
      setEditingTaskId(null);
      setActiveTaskId(null);
      setPendingTaskDelete(null);
      refreshStats();
      toast.success("Task deleted.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingTask(false);
    }
  };

  const addMember = async (event) => {
    event.preventDefault();
    if (!memberEmail.trim()) return;
    setAddingMember(true);
    setMemberError("");
    try {
      const { data } = await api.post(`/projects/${id}/members`, { email: memberEmail.trim() });
      setMembers((current) => [...current, data]);
      setMemberEmail("");
      toast.success(`${data.name} was added to the project.`);
    } catch (error) {
      setMemberError(getErrorMessage(error));
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async () => {
    if (!pendingMemberRemoval) return;
    setRemovingMember(true);
    setMemberError("");
    try {
      await api.delete(`/projects/${id}/members/${pendingMemberRemoval.id}`);
      setMembers((current) => current.filter((member) => member.id !== pendingMemberRemoval.id));
      setPendingMemberRemoval(null);
      toast.success("Project member removed.");
    } catch (error) {
      setMemberError(getErrorMessage(error));
    } finally {
      setRemovingMember(false);
    }
  };

  const openProjectSettings = () => {
    setProjectForm({ name: project?.name || "", description: project?.description || "" });
    setProjectError("");
    setShowSettings(true);
  };

  const saveProject = async (event) => {
    event.preventDefault();
    if (!projectForm.name.trim()) return;
    setSavingProject(true);
    setProjectError("");
    try {
      const { data } = await api.put(`/projects/${id}`, { name: projectForm.name.trim(), description: projectForm.description.trim() || null });
      setProject(data);
      window.dispatchEvent(new Event("taskflow:projects-changed"));
      setShowSettings(false);
      toast.success("Project settings updated.");
    } catch (error) {
      setProjectError(getErrorMessage(error));
    } finally {
      setSavingProject(false);
    }
  };

  const closeMembers = () => {
    if (!addingMember && !removingMember) {
      setShowMembers(false);
      setMemberError("");
      setPendingMemberRemoval(null);
    }
  };

  const hasFilters = Boolean(filters.q || filters.priority || filters.assigneeId || filters.status || filters.overdueOnly || filters.mineOnly || filters.groupBy !== "none" || filters.sortBy !== "position");
  const clearFilters = () => setFilters({ q: "", priority: "", assigneeId: "", status: "", overdueOnly: false, mineOnly: false, groupBy: "none", sortBy: "position" });
  const viewStorageKey = `tf_project_view_${id}`;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(viewStorageKey) || "null");
      if (saved?.view) setView(saved.view);
      if (saved?.filters) setFilters((current) => ({ ...current, ...saved.filters }));
    } catch {
      localStorage.removeItem(viewStorageKey);
    }
  }, [viewStorageKey]);

  const saveCurrentView = () => {
    try {
      localStorage.setItem(viewStorageKey, JSON.stringify({ view, filters }));
      toast.info("Saved view saved on this device.");
    } catch {
      toast.error("This browser could not save the view.");
    }
  };

  const toggleTask = (taskId) => {
    setSelectedTaskIds((current) => current.includes(taskId) ? current.filter((id) => id !== taskId) : [...current, taskId]);
  };

  const toggleAllTasks = () => {
    setSelectedTaskIds((current) => visibleTasks.length && visibleTasks.every((task) => current.includes(task.id)) ? [] : visibleTasks.map((task) => task.id));
  };

  const bulkMoveTasks = async (status) => {
    if (!selectedTaskIds.length || bulkMoving) return;
    setBulkMoving(true);
    try {
      const results = await Promise.allSettled(selectedTaskIds.map((taskId) => api.patch(`/projects/${id}/tasks/${taskId}/status`, { status })));
      const updates = new Map(results.filter((result) => result.status === "fulfilled").map((result) => [result.value.data.id, result.value.data]));
      if (updates.size) setTasks((current) => current.map((task) => updates.get(task.id) || task));
      if (updates.size) {
        setSelectedTaskIds([]);
        refreshStats();
        toast.success(`${updates.size} task${updates.size === 1 ? "" : "s"} moved to ${STATUS_META[status].label}.`);
      }
      if (results.some((result) => result.status === "rejected")) toast.error("Some tasks could not be moved. Try again for the remaining items.");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBulkMoving(false);
    }
  };

  if (loading) {
    return (
      <main id="main-content" className="page page-loading-state" tabIndex={-1}>
        <div className="page-loading-card">
          <Spinner plain />
          <div><strong>Opening workspace</strong><span>Loading your project and delivery board...</span></div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main id="main-content" className="page" tabIndex={-1}>
        <div className="state-card error-state project-error" role="alert">
          <span className="state-card-icon"><Icon name="alert" size={24} /></span>
          <div><h1>Project unavailable</h1><p>{loadError || "This project may have been removed or you may not have access."}</p></div>
          <Link to="/" className="btn secondary"><Icon name="arrowLeft" size={17} />Back to projects</Link>
        </div>
      </main>
    );
  }

  const statusCounts = stats?.statuses;
  const completion = Math.max(0, Math.min(100, Number(stats?.completionRate || 0)));
  const visibleMemberPreview = members.slice(0, 4);

  return (
    <main id="main-content" className="page project-page" tabIndex={-1}>
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/"><Icon name="arrowLeft" size={15} />Projects</Link>
        <Icon name="chevronRight" size={14} />
        <span>{project.name}</span>
      </nav>

      <section className="project-header" style={{ "--accent": projectAccent(project.id) }}>
        <div className="project-header-main">
          <span className="project-header-monogram">{initials(project.name)}</span>
          <div className="project-header-copy">
            <span className="eyebrow">Project workspace</span>
            <h1>{project.name}</h1>
            <p>{project.description || "Coordinate priorities and move work forward with your team."}</p>
            <div className="project-meta-line">
              <span><Icon name="user" size={14} />Owned by {project.createdByName}</span>
              <span><Icon name="clock" size={14} />Updated {timeAgo(project.updatedAt) || "recently"}</span>
            </div>
          </div>
        </div>
        <div className="project-header-actions">
          <div className="member-preview" aria-hidden="true">
            {visibleMemberPreview.map((member) => <Avatar key={member.id} name={member.name} size={30} decorative />)}
            {members.length > 4 && <span>+{members.length - 4}</span>}
          </div>
          <button type="button" className="btn secondary" onClick={() => setShowMembers(true)}>
            <Icon name="users" size={17} />
            <span>Members</span>
            <em>{members.length}</em>
          </button>
          {canManageProject && (
            <button type="button" className="icon-btn project-settings-button" onClick={openProjectSettings} aria-label="Project settings" title="Project settings">
              <Icon name="settings" size={18} />
            </button>
          )}
          {canManage && (
            <button type="button" className="btn primary" onClick={() => { setTaskError(""); setCreateStatus("TODO"); }}>
              <Icon name="plus" size={18} />New task
            </button>
          )}
        </div>
      </section>

      {stats && (
        <section className="project-metrics" aria-label="Project statistics">
          <article className="metric-card">
            <span className="metric-icon indigo"><Icon name="layers" size={19} /></span>
            <div><span>Total tasks</span><strong>{statusCounts?.total || 0}</strong><small>Across all stages</small></div>
          </article>
          <article className="metric-card">
            <span className="metric-icon cyan"><Icon name="refresh" size={19} /></span>
            <div><span>In progress</span><strong>{statusCounts?.inProgress || 0}</strong><small>Currently moving</small></div>
          </article>
          <article className="metric-card">
            <span className="metric-icon green"><Icon name="checkCircle" size={19} /></span>
            <div><span>Completed</span><strong>{statusCounts?.done || 0}</strong><small>Delivered tasks</small></div>
          </article>
          <article className={`metric-card ${stats.overdue ? "has-alert" : ""}`}>
            <span className="metric-icon red"><Icon name="alert" size={19} /></span>
            <div><span>Overdue</span><strong>{stats.overdue || 0}</strong><small>{stats.overdue ? "Needs attention" : "Everything on track"}</small></div>
          </article>
          <article className="completion-card" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completion} aria-label={`${completion}% complete`} style={{ "--completion": `${completion}%` }}>
            <div className="completion-ring"><span>{completion}%</span></div>
            <div><span>Completion rate</span><strong>{completion >= 80 ? "Excellent progress" : completion >= 40 ? "Work is moving" : "Ready to begin"}</strong><small>{statusCounts?.done || 0} of {statusCounts?.total || 0} tasks complete</small></div>
          </article>
        </section>
      )}

      <section className="work-section" aria-labelledby="work-title">
        <div className="work-section-heading">
          <div>
            <span className="eyebrow">Work management</span>
            <h2 id="work-title">Project workspace</h2>
            <p>{visibleTasks.length} of {tasks.length} task{tasks.length === 1 ? "" : "s"} visible</p>
          </div>
          {view === "board" && (
            <div className="board-legend">
              <span><i className="status-todo" />To do</span>
              <span><i className="status-progress" />In progress</span>
              <span><i className="status-review" />Review</span>
              <span><i className="status-done" />Done</span>
            </div>
          )}
        </div>

        <div className="project-view-bar">
          <div className="project-view-tabs" role="tablist" aria-label="Project view">
            <button type="button" role="tab" aria-selected={view === "board"} className={view === "board" ? "active" : ""} onClick={() => setView("board")}><Icon name="grid" size={15} />Board</button>
            <button type="button" role="tab" aria-selected={view === "list"} className={view === "list" ? "active" : ""} onClick={() => setView("list")}><Icon name="layers" size={15} />List</button>
            <button type="button" role="tab" aria-selected={view === "insights"} className={view === "insights" ? "active" : ""} onClick={() => setView("insights")}><Icon name="target" size={15} />Insights</button>
          </div>
          <button type="button" className="btn ghost small save-view-button" onClick={saveCurrentView}><Icon name="bookmark" size={15} />Save view</button>
        </div>

        <div className="board-toolbar" aria-label="Task filters">
          <div className="toolbar-search">
            <Icon name="search" size={18} />
            <label htmlFor="task-search" className="sr-only">Search tasks</label>
            <input
              id="task-search"
              value={filters.q}
              onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))}
              placeholder="Search by title or description"
            />
            {filters.q && <button type="button" onClick={() => setFilters((current) => ({ ...current, q: "" }))} aria-label="Clear search"><Icon name="close" size={14} /></button>}
          </div>
          <div className="toolbar-select">
            <Icon name="flag" size={16} />
            <label htmlFor="priority-filter" className="sr-only">Filter by priority</label>
            <select id="priority-filter" value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}>
              <option value="">All priorities</option>
              {PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
            </select>
          </div>
          <div className="toolbar-select">
            <Icon name="filter" size={16} />
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select id="status-filter" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
              <option value="">All statuses</option>
              {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <div className="toolbar-select">
            <Icon name="users" size={16} />
            <label htmlFor="assignee-filter" className="sr-only">Filter by assignee</label>
            <select id="assignee-filter" value={filters.assigneeId} onChange={(event) => setFilters((current) => ({ ...current, assigneeId: event.target.value }))}>
              <option value="">All assignees</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </div>
          {view === "list" && (
            <div className="toolbar-select">
              <Icon name="layers" size={16} />
              <label htmlFor="group-tasks" className="sr-only">Group tasks</label>
              <select id="group-tasks" value={filters.groupBy} onChange={(event) => setFilters((current) => ({ ...current, groupBy: event.target.value }))}>
                <option value="none">No grouping</option>
                <option value="status">Group by status</option>
                <option value="priority">Group by priority</option>
                <option value="assignee">Group by assignee</option>
              </select>
            </div>
          )}
          <button type="button" className={`quick-filter ${filters.mineOnly ? "active" : ""}`} onClick={() => setFilters((current) => ({ ...current, mineOnly: !current.mineOnly }))} aria-pressed={filters.mineOnly}><Icon name="user" size={15} />Mine</button>
          <button type="button" className={`quick-filter ${filters.overdueOnly ? "active" : ""}`} onClick={() => setFilters((current) => ({ ...current, overdueOnly: !current.overdueOnly }))} aria-pressed={filters.overdueOnly}><Icon name="alert" size={15} />Overdue</button>
          <div className="toolbar-select">
            <Icon name="sort" size={16} />
            <label htmlFor="sort-tasks" className="sr-only">Sort tasks</label>
            <select id="sort-tasks" value={filters.sortBy} onChange={(event) => setFilters((current) => ({ ...current, sortBy: event.target.value }))}>
              <option value="position">Board order</option>
              <option value="dueDate">Due date</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
            </select>
          </div>
          {hasFilters && <button type="button" className="clear-filters" onClick={clearFilters}><Icon name="close" size={14} />Clear</button>}
        </div>

        {view === "board" && (
          <div className="kanban">
          {STATUSES.map((column) => {
            const columnTasks = groupedTasks[column.value];
            return (
              <section className={`kanban-column ${column.className}`} key={column.value} aria-labelledby={`column-${column.value}`}>
                <div className="column-head">
                  <span className="column-status-dot" />
                  <h3 id={`column-${column.value}`}>{column.label}</h3>
                  <span className="column-count">{columnTasks.length}</span>
                  {canManage && (
                    <button
                      type="button"
                      className="icon-btn column-add"
                      onClick={() => { setTaskError(""); setCreateStatus(column.value); }}
                      aria-label={`Add task to ${column.label}`}
                      title={`Add to ${column.label}`}
                    >
                      <Icon name="plus" size={16} />
                    </button>
                  )}
                </div>
                <div className="column-body">
                  {columnTasks.length === 0 ? (
                    <div className="column-empty">
                      <span><Icon name="layers" size={19} /></span>
                      <strong>No tasks here</strong>
                      <p>{hasFilters ? "Try clearing your filters." : "Add a task when this stage is ready."}</p>
                    </div>
                  ) : columnTasks.map((task) => {
                    const nextStatus = STATUS_META[task.status]?.next;
                    return (
                      <TaskCard
                        key={task.id}
                        task={task}
                        canManage={canManage}
                        moving={movingTaskId === task.id}
                        onOpen={() => setActiveTaskId(task.id)}
                        onMove={nextStatus ? () => moveTask(task, nextStatus) : null}
                        moveLabel={nextStatus ? STATUS_META[nextStatus].label : "next stage"}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
          </div>
        )}

        {view === "list" && (
          <TaskList
            tasks={visibleTasks}
            canManage={canManage}
            groupBy={filters.groupBy}
            onOpen={setActiveTaskId}
            onMove={moveTask}
            movingTaskId={movingTaskId}
            selectedTaskIds={selectedTaskIds}
            onToggle={toggleTask}
            onToggleAll={toggleAllTasks}
            onBulkMove={bulkMoveTasks}
            bulkMoving={bulkMoving}
          />
        )}

        {view === "insights" && (
          <ProjectInsights project={project} tasks={tasks} stats={stats} members={members} user={user} onOpen={setActiveTaskId} />
        )}
      </section>

      {nextDue.length > 0 && (
        <section className="due-section" aria-labelledby="due-title">
          <div className="due-section-heading">
            <div><span className="eyebrow"><Icon name="calendar" size={14} /> Upcoming</span><h2 id="due-title">Next due</h2><p>Keep the most time-sensitive work visible.</p></div>
            <span className="section-count">{nextDue.length}</span>
          </div>
          <div className="due-list">
            {nextDue.map((task) => {
              const due = dueStatus(task.dueDate, task.status);
              const priority = PRIORITY_META[task.priority] || PRIORITY_META.MEDIUM;
              return (
                <article className="due-item" key={task.id}>
                  <button type="button" onClick={() => setActiveTaskId(task.id)}>
                    <span className={`due-status-line ${due.className}`} />
                    <span className="due-item-copy">
                      <strong>{task.title}</strong>
                      <span><em className={`priority ${priority.className}`}><i />{priority.label}</em>{task.projectName}</span>
                    </span>
                    <span className={`due-date ${due.className}`}><Icon name="calendar" size={15} />{due.label}</span>
                    {task.assigneeName && <Avatar name={task.assigneeName} color={task.assigneeAvatarColor} size={30} decorative />}
                    <Icon name="chevronRight" size={16} className="due-arrow" />
                  </button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {createStatus && (
        <TaskFormModal
          key={`create-${createStatus}`}
          defaultStatus={createStatus}
          members={members}
          onSubmit={saveTask}
          onClose={() => { if (!savingTask) { setCreateStatus(null); setTaskError(""); } }}
          submitting={savingTask}
          error={taskError}
        />
      )}

      {editingTask && (
        <TaskFormModal
          key={`edit-${editingTask.id}`}
          task={editingTask}
          members={members}
          onSubmit={saveTask}
          onClose={() => { if (!savingTask) { setEditingTaskId(null); setTaskError(""); } }}
          submitting={savingTask}
          error={taskError}
        >
          <button
            type="button"
            className="btn danger"
            onClick={() => {
              setTaskError("");
              setPendingTaskDelete(editingTask);
              setEditingTaskId(null);
            }}
          >
            <Icon name="trash" size={16} />Delete task
          </button>
        </TaskFormModal>
      )}

      {pendingTaskDelete && (
        <ConfirmDialog
          open
          title="Delete this task?"
          message={`“${pendingTaskDelete.title}” and its conversation will be permanently deleted.`}
          confirmLabel="Delete task"
          danger
          busy={deletingTask}
          onCancel={() => !deletingTask && setPendingTaskDelete(null)}
          onConfirm={deleteTask}
        />
      )}

      {activeTask && (
        <CommentsModal
          projectId={id}
          task={activeTask}
          me={user}
          canManage={canManage}
          onClose={() => setActiveTaskId(null)}
          onCommentCountChange={updateCommentCount}
          onEdit={() => {
            setTaskError("");
            setEditingTaskId(activeTask.id);
            setActiveTaskId(null);
          }}
        />
      )}

      {showSettings && canManageProject && (
        <Modal
          title="Project settings"
          description="Keep the project name and team context clear."
          onClose={() => { if (!savingProject) { setShowSettings(false); setProjectError(""); } }}
          closeDisabled={savingProject}
        >
          <form className="form project-settings-form" onSubmit={saveProject}>
            <div className="project-settings-summary" style={{ "--accent": projectAccent(project.id) }}>
              <span className="project-header-monogram">{initials(project.name)}</span>
              <div><strong>Workspace identity</strong><p>Changes are visible to everyone with project access.</p></div>
              <span className="role-chip admin">Project lead</span>
            </div>
            {projectError && <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{projectError}</span></div>}
            <div className="form-field">
              <div className="field-label-row"><label htmlFor="settings-project-name">Project name</label><span>{projectForm.name.length}/120</span></div>
              <input id="settings-project-name" value={projectForm.name} maxLength={120} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} required data-modal-initial-focus />
            </div>
            <div className="form-field">
              <div className="field-label-row"><label htmlFor="settings-project-description">Description</label><span>Optional</span></div>
              <textarea id="settings-project-description" value={projectForm.description} maxLength={500} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} placeholder="What does this project deliver?" />
            </div>
            <div className="project-settings-note"><Icon name="info" size={17} /><span>Task workflow, members, comments, and notifications continue using the existing project scope.</span></div>
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setShowSettings(false)} disabled={savingProject}>Cancel</button>
              <button type="submit" className="btn primary" disabled={savingProject || !projectForm.name.trim()}>{savingProject ? <Spinner label="Saving project" /> : <Icon name="check" size={16} />}Save changes</button>
            </div>
          </form>
        </Modal>
      )}

      {showMembers && (
        <Modal
          title="Project members"
          description="Invite teammates and keep ownership visible."
          onClose={closeMembers}
          closeDisabled={addingMember || removingMember}
        >
          <div className="members-panel">
            <div className="members-summary">
              <div><strong>{members.length}</strong><span>People with access</span></div>
              <div className="member-avatar-stack">
                {members.slice(0, 6).map((member) => <Avatar key={member.id} name={member.name} size={32} decorative />)}
              </div>
            </div>

            {pendingMemberRemoval && (
              <div className="member-removal-confirm" role="alert">
                <span><Icon name="alert" size={18} /><strong>Remove {pendingMemberRemoval.name}?</strong></span>
                <div>
                  <button type="button" className="btn ghost small" onClick={() => setPendingMemberRemoval(null)} disabled={removingMember}>Cancel</button>
                  <button type="button" className="btn danger-solid small" onClick={removeMember} disabled={removingMember}>
                    {removingMember ? <Spinner label="Removing member" /> : "Remove"}
                  </button>
                </div>
              </div>
            )}

            {memberError && <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{memberError}</span></div>}

            <ul className="member-list">
              {members.map((member) => (
                <li key={member.id} className="member-row">
                  <Avatar name={member.name} size={40} decorative />
                  <div className="member-identity"><strong>{member.name}{member.id === user?.id && <em>You</em>}</strong><span>{member.email}</span></div>
                  <span className={`role-chip ${String(member.role || "member").toLowerCase()}`}>{roleLabel(member.role)}</span>
                  {canManageProject && member.id !== user?.id && !pendingMemberRemoval && (
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={() => setPendingMemberRemoval(member)}
                      aria-label={`Remove ${member.name}`}
                      title="Remove member"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {canManageProject && (
              <form className="member-invite" onSubmit={addMember}>
                <div className="member-invite-heading"><span><Icon name="users" size={17} /></span><div><strong>Add a teammate</strong><p>They’ll join using an existing TaskFlow account.</p></div></div>
                <div className="member-invite-form">
                  <div className="input-shell plain-input">
                    <Icon name="mail" size={17} />
                    <label htmlFor="member-email" className="sr-only">Teammate email address</label>
                    <input
                      id="member-email"
                      type="email"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      placeholder="teammate@company.com"
                      autoComplete="email"
                      required
                      data-modal-initial-focus
                    />
                  </div>
                  <button type="submit" className="btn primary" disabled={addingMember || !memberEmail.trim()}>
                    {addingMember ? <Spinner label="Adding member" /> : <Icon name="plus" size={17} />}
                    <span>{addingMember ? "Adding..." : "Add member"}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </Modal>
      )}
    </main>
  );
}
