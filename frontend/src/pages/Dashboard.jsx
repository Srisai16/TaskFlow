import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import ConfirmDialog from "../components/ConfirmDialog";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import Spinner from "../components/Spinner";
import { initials, projectAccent, timeAgo } from "../utils/format";

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [projectQuery, setProjectQuery] = useState("");
  const [projectView, setProjectView] = useState("all");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await api.get("/projects");
      setProjects(response.data || []);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const totalTasks = projects.reduce((sum, project) => sum + Number(project.taskCount || 0), 0);
    const completedTasks = projects.reduce((sum, project) => sum + Number(project.doneCount || 0), 0);
    return {
      projects: projects.length,
      totalTasks,
      activeTasks: Math.max(0, totalTasks - completedTasks),
      completedTasks,
      completion: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }, [projects]);

  const attentionProjects = useMemo(() => projects
    .filter((project) => Number(project.taskCount || 0) > 0 && Number(project.doneCount || 0) / Number(project.taskCount || 1) < 0.5)
    .slice(0, 3), [projects]);

  const recentProjects = useMemo(() => [...projects]
    .sort((first, second) => new Date(second.updatedAt || 0) - new Date(first.updatedAt || 0))
    .slice(0, 3), [projects]);

  const visibleProjects = useMemo(() => {
    const query = projectQuery.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery = !query || `${project.name} ${project.description || ""}`.toLowerCase().includes(query);
      const progress = Number(project.taskCount || 0) ? Number(project.doneCount || 0) / Number(project.taskCount) : 1;
      const matchesView = projectView !== "attention" || (Number(project.taskCount || 0) > 0 && progress < 0.5);
      return matchesQuery && matchesView;
    });
  }, [projectQuery, projectView, projects]);

  const openCreate = useCallback(() => {
    setForm({ name: "", description: "" });
    setCreateError("");
    setShowCreate(true);
  }, []);

  useEffect(() => {
    if (location.state?.createProject) {
      openCreate();
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, openCreate]);

  const createProject = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const { data } = await api.post("/projects", {
        name: form.name.trim(),
        description: form.description.trim() || null,
      });
      setProjects((current) => [data, ...current]);
      window.dispatchEvent(new Event("taskflow:projects-changed"));
      setShowCreate(false);
      setForm({ name: "", description: "" });
      toast.success(`${data.name} is ready to plan.`);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const deleteProject = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${pendingDelete.id}`);
      setProjects((current) => current.filter((project) => project.id !== pendingDelete.id));
      window.dispatchEvent(new Event("taskflow:projects-changed"));
      toast.success(`${pendingDelete.name} was deleted.`);
      setPendingDelete(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <main id="main-content" className="page dashboard-page" tabIndex={-1}>
      <section className="dashboard-hero" aria-labelledby="dashboard-title">
        <div className="dashboard-hero-copy">
          <span className="eyebrow"><Icon name="sparkles" size={14} /> Workspace overview</span>
          <h1 id="dashboard-title">Welcome back, {firstName}</h1>
          <p>Here’s what’s moving across your projects today.</p>
        </div>
        <button type="button" className="btn primary" onClick={openCreate}>
          <Icon name="plus" size={18} />
          New project
        </button>
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
      </section>

      <section className="overview-grid" aria-label="Workspace summary">
        <article className="overview-card accent-indigo">
          <span className="overview-icon"><Icon name="folder" size={20} /></span>
          <div><strong>{summary.projects}</strong><span>Active projects</span></div>
          <em>Portfolio</em>
        </article>
        <article className="overview-card accent-cyan">
          <span className="overview-icon"><Icon name="layers" size={20} /></span>
          <div><strong>{summary.activeTasks}</strong><span>Open tasks</span></div>
          <em>In progress</em>
        </article>
        <article className="overview-card accent-green">
          <span className="overview-icon"><Icon name="checkCircle" size={20} /></span>
          <div><strong>{summary.completedTasks}</strong><span>Tasks completed</span></div>
          <em>{summary.completion}% overall</em>
        </article>
        <article className="overview-card accent-violet">
          <span className="overview-icon"><Icon name="target" size={20} /></span>
          <div><strong>{summary.completion}%</strong><span>Completion rate</span></div>
          <em>All projects</em>
        </article>
      </section>

      <section className="workspace-pulse" aria-labelledby="pulse-title">
        <div className="section-heading">
          <div><span className="eyebrow"><Icon name="sparkles" size={14} /> Portfolio pulse</span><h2 id="pulse-title">Keep delivery visible</h2><p>A quick read on projects that need a decision or a nudge.</p></div>
          <button type="button" className="btn ghost small" onClick={() => setProjectView("attention")}><Icon name="filter" size={15} />Focus attention</button>
        </div>
        <div className="pulse-grid">
          <article className="pulse-card delivery-health">
            <div className="pulse-card-head"><span className="pulse-icon green"><Icon name="target" size={18} /></span><div><strong>Delivery health</strong><small>Across your portfolio</small></div></div>
            <div className="health-score"><strong>{summary.completion}%</strong><span>overall completion</span></div>
            <div className="pulse-progress"><span style={{ width: `${summary.completion}%` }} /></div>
            <div className="pulse-foot"><span>{summary.completedTasks} completed</span><span>{summary.activeTasks} open</span></div>
          </article>
          <article className="pulse-card attention-card">
            <div className="pulse-card-head"><span className="pulse-icon amber"><Icon name="alert" size={18} /></span><div><strong>Needs attention</strong><small>Projects under 50% complete</small></div></div>
            {attentionProjects.length ? <div className="pulse-list">{attentionProjects.map((project) => <Link key={project.id} to={`/projects/${project.id}`}><span><strong>{project.name}</strong><small>{project.doneCount || 0} of {project.taskCount || 0} tasks done</small></span><Icon name="arrowUpRight" size={14} /></Link>)}</div> : <div className="pulse-empty"><Icon name="checkCircle" size={18} /><span>Everything is on track.</span></div>}
          </article>
          <article className="pulse-card recent-card">
            <div className="pulse-card-head"><span className="pulse-icon blue"><Icon name="clock" size={18} /></span><div><strong>Recently updated</strong><small>Your latest project activity</small></div></div>
            {recentProjects.length ? <div className="pulse-list">{recentProjects.map((project) => <Link key={project.id} to={`/projects/${project.id}`}><span><strong>{project.name}</strong><small>{timeAgo(project.updatedAt) || "Recently"}</small></span><Icon name="arrowUpRight" size={14} /></Link>)}</div> : <div className="pulse-empty"><Icon name="folder" size={18} /><span>Your projects will appear here.</span></div>}
          </article>
        </div>
      </section>

      <section className="content-section" aria-labelledby="projects-heading">
        <div className="section-heading">
          <div>
            <h2 id="projects-heading">Your projects</h2>
            <p>{projects.length ? `${projects.length} workspace${projects.length === 1 ? "" : "s"}` : "Create a workspace for your next initiative"}</p>
          </div>
          {projects.length > 0 && <span className="section-count">{visibleProjects.length}</span>}
        </div>

        {projects.length > 0 && (
          <div className="project-list-toolbar">
            <div className="workspace-search">
              <Icon name="search" size={17} />
              <label htmlFor="project-search" className="sr-only">Filter projects</label>
              <input id="project-search" value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Filter projects" />
              {projectQuery && <button type="button" onClick={() => setProjectQuery("")} aria-label="Clear project filter"><Icon name="close" size={14} /></button>}
            </div>
            <div className="segmented-control" role="group" aria-label="Project view">
              <button type="button" className={projectView === "all" ? "active" : ""} onClick={() => setProjectView("all")}><Icon name="grid" size={14} />All projects</button>
              <button type="button" className={projectView === "attention" ? "active" : ""} onClick={() => setProjectView("attention")}><Icon name="alert" size={14} />Needs attention</button>
            </div>
          </div>
        )}

        {loadError && projects.length === 0 ? (
          <div className="state-card error-state" role="alert">
            <span className="state-card-icon"><Icon name="alert" size={24} /></span>
            <div><h3>We couldn’t load your projects</h3><p>{loadError}</p></div>
            <button type="button" className="btn secondary" onClick={load}><Icon name="refresh" size={17} />Try again</button>
          </div>
        ) : loadError ? (
          <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{loadError}</span></div>
        ) : loading ? (
          <div className="card-grid" aria-label="Loading projects">
            {Array.from({ length: 4 }, (_, index) => <div className="project-card skeleton-card" key={index}><span /><span /><span /><span /></div>)}
          </div>
        ) : projects.length === 0 ? (
          <div className="state-card empty-state">
            <span className="state-illustration"><Icon name="folder" size={29} /></span>
            <div><h3>Your first project starts here</h3><p>Create a project, invite your team, and turn priorities into clear next steps.</p></div>
            <button type="button" className="btn primary" onClick={openCreate}><Icon name="plus" size={18} />Create project</button>
          </div>
        ) : visibleProjects.length === 0 ? (
          <div className="state-card empty-state compact-empty">
            <span className="state-illustration"><Icon name="search" size={26} /></span>
            <div><h3>No projects match this view</h3><p>Try clearing the search or switching back to all projects.</p></div>
            <button type="button" className="btn secondary" onClick={() => { setProjectQuery(""); setProjectView("all"); }}>Clear filters</button>
          </div>
        ) : (
          <div className="card-grid">
            {visibleProjects.map((project) => {
              const taskCount = Number(project.taskCount || 0);
              const doneCount = Number(project.doneCount || 0);
              const progress = taskCount ? Math.round((doneCount / taskCount) * 100) : 0;
              return (
                <article
                  className="project-card"
                  key={project.id}
                  style={{ "--accent": projectAccent(project.id), "--progress": `${progress}%` }}
                >
                  <Link to={`/projects/${project.id}`} className="project-card-main" aria-label={`Open ${project.name}`}>
                    <div className="project-card-top">
                      <span className="project-monogram">{initials(project.name)}</span>
                      <div className="project-card-title">
                        <span>Project</span>
                        <h3>{project.name}</h3>
                      </div>
                      <span className="project-open-icon"><Icon name="arrowUpRight" size={17} /></span>
                    </div>
                    <p className="project-description">{project.description || "Add a description to give your team context."}</p>
                    <div className="project-progress-meta">
                      <span>{taskCount ? `${doneCount} of ${taskCount} complete` : "Ready for tasks"}</span>
                      <strong>{progress}%</strong>
                    </div>
                    <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label={`${progress}% complete`}><span /></div>
                    <div className="project-card-footer">
                      <span><Icon name="users" size={15} /> {project.memberCount || 0} member{project.memberCount === 1 ? "" : "s"}</span>
                      <span><Icon name="clock" size={15} /> {timeAgo(project.updatedAt) || "Recently"}</span>
                    </div>
                  </Link>
                  {(project.currentUserIsCreator || user?.role === "ADMIN") && (
                    <button
                      type="button"
                      className="icon-btn danger project-delete"
                      onClick={() => setPendingDelete(project)}
                      aria-label={`Delete ${project.name}`}
                      title="Delete project"
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showCreate && (
        <Modal
          title="Create a new project"
          description="Set a clear home for your team’s goals, tasks, and progress."
          onClose={() => !creating && setShowCreate(false)}
          closeDisabled={creating}
        >
          <form className="form" onSubmit={createProject}>
            <div className="form-field">
              <div className="field-label-row"><label htmlFor="project-name">Project name</label><span>{form.name.length}/120</span></div>
              <div className="input-shell plain-input">
                <Icon name="briefcase" size={18} />
                <input
                  id="project-name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Mobile app launch"
                  maxLength={120}
                  required
                  data-modal-initial-focus
                />
              </div>
            </div>
            <div className="form-field">
              <div className="field-label-row"><label htmlFor="project-description">Description</label><span>Optional</span></div>
              <textarea
                id="project-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What does your team want to achieve?"
                rows={4}
                maxLength={500}
              />
              <span className="field-hint align-right">{form.description.length}/500</span>
            </div>
            {createError && <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{createError}</span></div>}
            <div className="form-actions">
              <button type="button" className="btn secondary" onClick={() => setShowCreate(false)} disabled={creating}>Cancel</button>
              <button type="submit" className="btn primary" disabled={creating || !form.name.trim()}>
                {creating ? <Spinner label="Creating project" /> : <Icon name="plus" size={18} />}
                <span>{creating ? "Creating..." : "Create project"}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          open
          title="Delete this project?"
          message={`“${pendingDelete.name}” and all of its tasks will be permanently deleted. This action cannot be undone.`}
          confirmLabel="Delete project"
          danger
          busy={deleting}
          onCancel={() => !deleting && setPendingDelete(null)}
          onConfirm={deleteProject}
        />
      )}
    </main>
  );
}
