import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import TaskCard from "../components/TaskCard";
import TaskFormModal from "../components/TaskFormModal";
import CommentsModal from "../components/CommentsModal";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import { useToast } from "../context/ToastContext";

const COLUMNS = [
  { status: "TODO", label: "To Do" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "IN_REVIEW", label: "In Review" },
  { status: "DONE", label: "Done" },
];

const NEXT_STATUS = {
  TODO: "IN_PROGRESS",
  IN_PROGRESS: "IN_REVIEW",
  IN_REVIEW: "DONE",
  DONE: null,
};

export default function Project() {
  const toast = useToast();
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [nextDue, setNextDue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({ q: "", priority: "", assigneeId: "", sortBy: "position" });
  const [showCreate, setShowCreate] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [memberEmail, setMemberEmail] = useState("");

  const canManage = project?.currentUserIsCreator || user?.role === "ADMIN";

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/projects/${id}/tasks`),
      api.get(`/projects/${id}/dashboard`),
      api.get(`/projects/${id}/tasks/next-due?limit=6`),
    ])
      .then(([p, t, d, nd]) => {
        setProject(p.data.project);
        setMembers(p.data.members);
        setTasks(t.data);
        setStats(d.data);
        setNextDue(nd.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const visibleTasks = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    const arr = tasks.filter((t) => {
      const matchQ =
        !q || t.title.toLowerCase().includes(q) || (t.description || "").toLowerCase().includes(q);
      const matchP = !filters.priority || t.priority === filters.priority;
      const matchA = !filters.assigneeId || String(t.assigneeId) === filters.assigneeId;
      return matchQ && matchP && matchA;
    });
    const sorted = [...arr];
    // eslint-disable-next-line no-unused-vars
    const sortKeys = { dueDate: "dueDate", priority: "priority", title: "title" };
    if (filters.sortBy === "dueDate") {
      sorted.sort((a, b) =>
        a.dueDate === b.dueDate ? 0 : !a.dueDate ? 1 : !b.dueDate ? -1 : a.dueDate < b.dueDate ? -1 : 1
      );
    } else if (filters.sortBy === "priority") {
      const weight = { URGENT: 3, HIGH: 2, MEDIUM: 1, LOW: 0 };
      sorted.sort((a, b) => weight[b.priority] - weight[a.priority]);
    } else if (filters.sortBy === "title") {
      sorted.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      sorted.sort((a, b) => a.position - b.position);
    }
    return sorted;
  }, [tasks, filters]);

  const groupByStatus = useMemo(() => {
    const map = {};
    for (const c of COLUMNS) map[c.status] = [];
    for (const t of visibleTasks) map[t.status]?.push(t);
    return map;
  }, [visibleTasks]);

  const refreshStats = useCallback(() => {
    Promise.all([
      api.get(`/projects/${id}/dashboard`),
      api.get(`/projects/${id}/tasks/next-due?limit=6`),
    ])
      .then(([d, nd]) => {
        setStats(d.data);
        setNextDue(nd.data);
      })
      .catch(() => {});
  }, [id]);

  const moveTask = async (task, status) => {
    setError("");
    try {
      const { data } = await api.patch(`/projects/${id}/tasks/${task.id}/status`, { status });
      setTasks((prev) => prev.map((t) => (t.id === data.id ? data : t)));
      refreshStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const saveTask = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const url = `/projects/${id}/tasks${editingTask ? `/${editingTask.id}` : ""}`;
      const { data } = await api[purl(editingTask)](url, payload);
      setTasks((prev) =>
        editingTask
          ? prev.map((t) => (t.id === data.id ? data : t))
          : [...prev, data]
      );
      setShowCreate(null);
      setEditingTask(null);
      refreshStats();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm("Delete this task?")) return;
    setError("");
    try {
      await api.delete(`/projects/${id}/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setEditingTask(null);
      refreshStats();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const addMember = async (e) => {
    e.preventDefault();
    if (!memberEmail.trim()) return;
    setError("");
    try {
      const { data } = await api.post(`/projects/${id}/members`, { email: memberEmail.trim() });
      setMembers((prev) => [...prev, data]);
      setMemberEmail("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const removeMember = async (userId) => {
    if (!window.confirm("Remove this member from the project?")) return;
    setError("");
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading) {
    return (
      <main className="page center pad">
        <Spinner />
      </main>
    );
  }

  if (!project) {
    return (
      <main className="page">
        <div className="alert error">{error || "Project not found"}</div>
        <Link to="/" className="link-btn">
          &larr; Back to projects
        </Link>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <Link to="/" className="muted back-link">
            &larr; Projects
          </Link>
          <h2>{project.name}</h2>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <div className="page-actions">
          <button className="btn ghost" onClick={() => setShowMembers(true)}>
            Members ({members.length})
          </button>
          {canManage && (
            <button className="btn primary" onClick={() => setShowCreate(COLUMNS[0].status)}>
              + New Task
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <span className="stat-num">{stats.statuses.total}</span>
            <span className="muted">Total tasks</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{stats.statuses.inProgress}</span>
            <span className="muted">In progress</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{stats.statuses.done}</span>
            <span className="muted">Done</span>
          </div>
          <div className="stat-card warn">
            <span className="stat-num">{stats.overdue}</span>
            <span className="muted">Overdue</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">{stats.completionRate}%</span>
            <span className="muted">Completion</span>
          </div>
        </div>
      )}

      <div className="toolbar">
        <input
          className="search"
          placeholder="Search tasks..."
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
        />
        <select
          value={filters.priority}
          onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
        >
          <option value="">All priorities</option>
          {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          value={filters.assigneeId}
          onChange={(e) => setFilters((f) => ({ ...f, assigneeId: e.target.value }))}
        >
          <option value="">All assignees</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          value={filters.sortBy}
          onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value }))}
        >
          <option value="position">Sort: Custom</option>
          <option value="dueDate">Sort: Due date</option>
          <option value="priority">Sort: Priority</option>
          <option value="title">Sort: Title</option>
        </select>
      </div>

      <div className="kanban">
        {COLUMNS.map((col) => (
          <section key={col.status} className="column">
            <div className="column-head">
              <h4>{col.label}</h4>
              <span className="count">{groupByStatus[col.status].length}</span>
              {canManage && (
                <button
                  className="icon-btn"
                  title={`Add to ${col.label}`}
                  onClick={() => setShowCreate(col.status)}
                >
                  +
                </button>
              )}
            </div>
            <div className="column-body">
              {groupByStatus[col.status].length === 0 ? (
                <p className="muted column-empty">Nothing here</p>
              ) : (
                groupByStatus[col.status].map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    canManage={canManage}
                    onOpen={() => setActiveTask(t)}
                    onMove={NEXT_STATUS[t.status] ? () => moveTask(t, NEXT_STATUS[t.status]) : null}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </div>

      {nextDue.length > 0 && (
        <section className="next-due">
          <h4>Next due</h4>
          <ul>
            {nextDue.map((t) => (
              <li key={t.id} className={t.overdue ? "overdue" : ""}>
                <button className="link-btn" onClick={() => setActiveTask(t)}>
                  {t.title}
                </button>
                <span>{t.dueDate}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showCreate && (
        <TaskFormModal
          defaultStatus={showCreate}
          members={members}
          onSubmit={saveTask}
          onClose={() => setShowCreate(null)}
          submitting={saving}
        />
      )}

      {editingTask && (
        <TaskFormModal
          task={editingTask}
          members={members}
          onSubmit={saveTask}
          onClose={() => setEditingTask(null)}
          submitting={saving}
        >
          <button type="button" className="btn danger" onClick={() => deleteTask(editingTask.id)}>
            Delete
          </button>
        </TaskFormModal>
      )}

      {activeTask && (
        <CommentsModal
          projectId={id}
          task={activeTask}
          me={user}
          canManage={canManage}
          onClose={() => setActiveTask(null)}
          onEdit={() => {
            setEditingTask(activeTask);
            setActiveTask(null);
          }}
        />
      )}

      {showMembers && (
        <Modal title="Project members" onClose={() => setShowMembers(false)}>
          <ul className="member-list">
            {members.map((m) => (
              <li key={m.id}>
                <Avatar name={m.name} color={m.avatarColor ?? null} size={34} />
                <div>
                  <strong>{m.name}</strong>
                  <small className="muted">{m.email}</small>
                </div>
                <span className={`chip ${m.role.toLowerCase()}`}>{m.role}</span>
                {canManage && m.id !== user.id && (
                  <button className="icon-btn danger" onClick={() => removeMember(m.id)}>
                    &times;
                  </button>
                )}
              </li>
            ))}
          </ul>
          {canManage && (
            <form className="form member-form" onSubmit={addMember}>
              <input
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="member@email.com"
                type="email"
                required
              />
              <button type="submit" className="btn primary" disabled={!memberEmail.trim()}>
                Add
              </button>
            </form>
          )}
        </Modal>
      )}
    </main>
  );
}

function purl(isEdit) {
  return isEdit ? "put" : "post";
}