import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import { initials, projectAccent } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/projects")
      .then((res) => setProjects(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const createProject = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      const { data } = await api.post("/projects", {
        name: form.name.trim(),
        description: form.description || null,
      });
      setProjects((prev) => [data, ...prev]);
      setShowCreate(false);
      setForm({ name: "", description: "" });
      toast.success("Project created");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async (id) => {
    setError("");
    try {
      await api.delete(`/projects/${id}`);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      toast.success("Project deleted");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h2>Hi {user.name.split(" ")[0]} 👋</h2>
          <p className="muted">Projects you belong to</p>
        </div>
        <button className="btn primary" onClick={() => setShowCreate(true)}>
          + New Project
        </button>
      </div>

      {error && <div className="alert error">{error}</div>}

      {loading ? (
        <div className="center pad">
          <Spinner />
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-card">
          <h3>No projects yet</h3>
          <p className="muted">Create your first project to start tracking tasks.</p>
          <button className="btn primary" onClick={() => setShowCreate(true)}>
            + New Project
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {projects.map((p) => (
            <div
              key={p.id}
              className="project-card"
              style={{ "--accent": projectAccent(p.id) }}
              onClick={() => navigate(`/projects/${p.id}`)}
            >
              <div className="project-card-top">
                <div className="project-avatar">
                  <Icon name="plus" size={17} />
                  <strong>{initials(p.name)}</strong>
                </div>
                <div>
                  <h3>{p.name}</h3>
                  {p.taskCount !== undefined && (
                    <small className="muted">
                      {p.taskCount} task{p.taskCount === 1 ? "" : "s"}
                      {typeof p.doneCount === "number" && p.doneCount > 0
                        ? ` · ${p.doneCount} done`
                        : ""}
                    </small>
                  )}
                </div>
                {p.currentUserIsCreator && (
                  <button
                    className="icon-btn danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(p);
                    }}
                    title="Delete project"
                  >
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              {p.description && <p className="muted">{p.description}</p>}
              <div className="project-card-footer">
                <span>{p.memberCount} member{p.memberCount === 1 ? "" : "s"}</span>
                <span>by {p.createdByName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <Modal title="New Project" onClose={() => setShowCreate(false)}>
          <form className="form" onSubmit={createProject}>
            <label>
              Project name <span className="req">*</span>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Mobile App Launch"
                maxLength={120}
                autoFocus
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Optional"
              />
            </label>
            <div className="form-actions">
              <button type="button" className="btn ghost" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary" disabled={creating || !form.name.trim()}>
                {creating ? <Spinner /> : "Create"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          title="Delete project"
          message={`"${pendingDelete.name}" and all of its tasks will be permanently deleted.`}
          confirmLabel="Delete"
          danger
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            deleteProject(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </main>
  );
}