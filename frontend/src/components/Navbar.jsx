import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api, { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { initials, projectAccent, timeAgo } from "../utils/format";
import Avatar from "./Avatar";
import Icon from "./Icon";

function roleLabel(role) {
  if (!role) return "Member";
  return role.charAt(0) + role.slice(1).toLowerCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items, unread, loading, error, refresh, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const notificationRef = useRef(null);
  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  const notificationButtonRef = useRef(null);
  const searchInputRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const commandItemRefs = useRef([]);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandIndex, setCommandIndex] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user) {
      setProjects([]);
      setProjectsError("");
      return;
    }
    setProjectsLoading(true);
    try {
      const response = await api.get("/projects");
      setProjects(response.data || []);
      setProjectsError("");
    } catch (requestError) {
      setProjectsError(getErrorMessage(requestError));
    } finally {
      setProjectsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadProjects();
    const refreshProjects = () => loadProjects();
    window.addEventListener("taskflow:projects-changed", refreshProjects);
    return () => window.removeEventListener("taskflow:projects-changed", refreshProjects);
  }, [loadProjects]);

  useEffect(() => {
    const handleShortcut = (event) => {
      const target = event.target;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping = tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable;
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      } else if (event.key === "/" && !isTyping) {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (searchOpen) requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [searchOpen]);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handlePointer = (event) => {
      if (!notificationRef.current?.contains(event.target)) setNotificationsOpen(false);
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const handleKey = (event) => {
      if (event.key !== "Escape") return;
      if (searchOpen) {
        closeSearch();
        return;
      }
      if (notificationsOpen) {
        setNotificationsOpen(false);
        notificationButtonRef.current?.focus();
      }
      if (profileOpen) {
        setProfileOpen(false);
        profileButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notificationsOpen, profileOpen, searchOpen]);

  const matchingProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((project) => `${project.name} ${project.description || ""}`.toLowerCase().includes(query));
  }, [projects, searchQuery]);

  const commandItems = useMemo(() => [
    { key: "create", type: "create" },
    ...matchingProjects.map((project) => ({ key: `project-${project.id}`, type: "project", project })),
  ], [matchingProjects]);

  useEffect(() => {
    setCommandIndex(0);
    commandItemRefs.current = [];
  }, [searchQuery, commandItems.length]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    requestAnimationFrame(() => commandItemRefs.current[commandIndex]?.scrollIntoView({ block: "nearest" }));
    return undefined;
  }, [commandIndex, searchOpen]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const handleCommandKey = (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setCommandIndex((current) => Math.min(current + 1, commandItems.length - 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setCommandIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === "Enter") {
        const item = commandItems[commandIndex];
        if (item?.type === "create") {
          event.preventDefault();
          goToCreateProject();
        } else if (item?.project) {
          event.preventDefault();
          goToProject(item.project.id);
        }
      }
    };
    document.addEventListener("keydown", handleCommandKey);
    return () => document.removeEventListener("keydown", handleCommandKey);
  }, [commandIndex, commandItems, searchOpen]);

  const currentProjectId = location.pathname.startsWith("/projects/") ? location.pathname.split("/")[2] : null;
  const currentProject = projects.find((project) => String(project.id) === currentProjectId);
  const isOverview = location.pathname === "/";

  const closeSidebar = () => setSidebarOpen(false);
  const closeSearch = () => {
    setSearchOpen(false);
    window.requestAnimationFrame(() => searchTriggerRef.current?.focus());
  };
  const openSearch = () => {
    setSearchOpen(true);
    setSearchQuery("");
    setCommandIndex(0);
    setNotificationsOpen(false);
    setProfileOpen(false);
    setSidebarOpen(false);
  };
  const goToProject = (projectId) => {
    navigate(`/projects/${projectId}`);
    closeSearch();
    setSearchQuery("");
    closeSidebar();
  };
  const goToProjects = () => {
    navigate("/");
    closeSidebar();
    window.setTimeout(() => document.getElementById("projects-heading")?.scrollIntoView({ behavior: "smooth" }), 0);
  };
  const goToCreateProject = () => {
    navigate("/", { state: { createProject: true } });
    closeSearch();
    setSearchQuery("");
    closeSidebar();
  };
  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  if (!user) return null;

  return (
    <>
      <aside className={`workspace-sidebar ${sidebarOpen ? "is-open" : ""}`} aria-label="Workspace navigation">
        <div className="sidebar-brand-row">
          <Link to="/" className="sidebar-brand" onClick={closeSidebar} aria-label="TaskFlow home">
            <span className="brand-mark"><Icon name="check" size={18} strokeWidth={2.5} /></span>
            <span><strong>TaskFlow</strong><small>Team workspace</small></span>
          </Link>
          <button type="button" className="icon-btn sidebar-close" onClick={closeSidebar} aria-label="Close navigation">
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-switcher-mark">TF</span>
          <span><strong>TaskFlow workspace</strong><small>Product &amp; delivery</small></span>
          <Icon name="chevronDown" size={15} />
        </div>

        <nav className="sidebar-nav">
          <span className="sidebar-label">Workspace</span>
          <Link to="/" className={`sidebar-link ${isOverview ? "active" : ""}`} onClick={closeSidebar}>
            <Icon name="grid" size={17} /><span>Overview</span>
          </Link>
          <button type="button" className="sidebar-link" onClick={goToProjects}>
            <Icon name="folder" size={17} /><span>Projects</span><em>{projects.length}</em>
          </button>
          <button type="button" className="sidebar-link" onClick={openSearch}>
            <Icon name="search" size={17} /><span>Quick find</span><kbd>⌘ K</kbd>
          </button>
        </nav>

        <div className="sidebar-projects">
          <div className="sidebar-section-head">
            <span>Your projects</span>
            <button type="button" className="sidebar-add" onClick={goToCreateProject} aria-label="Create project"><Icon name="plus" size={15} /></button>
          </div>
          {projectsLoading && projects.length === 0 ? (
            <div className="sidebar-project-skeletons"><span /><span /><span /></div>
          ) : projectsError ? (
            <div className="sidebar-project-error">
              <span>{projectsError}</span>
              <button type="button" onClick={loadProjects}>Retry</button>
            </div>
          ) : projects.length === 0 ? (
            <p className="sidebar-empty">No projects yet</p>
          ) : (
            <div className="sidebar-project-list">
              {projects.slice(0, 6).map((project) => {
                const active = String(project.id) === currentProjectId;
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className={`sidebar-project ${active ? "active" : ""}`}
                    onClick={closeSidebar}
                    style={{ "--project-accent": projectAccent(project.id) }}
                  >
                    <span className="sidebar-project-dot" />
                    <span className="sidebar-project-name">{project.name}</span>
                    {project.currentUserIsCreator && <Icon name="shield" size={13} />}
                  </Link>
                );
              })}
              {projects.length > 6 && <button type="button" className="sidebar-view-all" onClick={goToProjects}>View all projects <Icon name="chevronRight" size={13} /></button>}
            </div>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-tip"><span><Icon name="sparkles" size={15} /></span><div><strong>Keep momentum</strong><p>Use Quick find to jump anywhere.</p></div></div>
          <div className="sidebar-user">
            <Avatar name={user.name} color={user.avatarColor} size={34} decorative />
            <div><strong>{user.name}</strong><span>{roleLabel(user.role)}</span></div>
            <Icon name="more" size={16} />
          </div>
        </div>
      </aside>

      {sidebarOpen && <button type="button" className="sidebar-scrim" onClick={closeSidebar} aria-label="Close navigation overlay" />}

      <header className="navbar">
        <div className="navbar-inner">
          <div className="navbar-leading">
            <button type="button" className="icon-btn mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open navigation"><Icon name="menu" size={20} /></button>
            <div className="top-breadcrumb" aria-label="Current location">
              <Link to="/">Workspace</Link>
              {currentProject && <><Icon name="chevronRight" size={14} /><span>{currentProject.name}</span></>}
            </div>
          </div>
          <button ref={searchTriggerRef} type="button" className="global-search-trigger" onClick={openSearch}>
            <Icon name="search" size={17} /><span>Search projects or commands</span><kbd>⌘ K</kbd>
          </button>
          <div className="navbar-actions">
            <div className="popover-anchor" ref={notificationRef}>
              <button
                ref={notificationButtonRef}
                type="button"
                className={`icon-btn navbar-icon ${notificationsOpen ? "is-active" : ""}`}
                onClick={() => {
                  setNotificationsOpen((open) => !open);
                  setProfileOpen(false);
                }}
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
              >
                <Icon name="bell" size={19} />
                {unread > 0 && <span className="notification-badge">{unread > 99 ? "99+" : unread}</span>}
              </button>

              {notificationsOpen && (
                <div className="notif-panel" role="dialog" aria-label="Notifications">
                  <div className="notif-head">
                    <div>
                      <strong>Notifications</strong>
                      <span>{unread ? `${unread} unread update${unread === 1 ? "" : "s"}` : "You're all caught up"}</span>
                    </div>
                    {unread > 0 && <button type="button" className="link-btn" onClick={markAllRead}>Mark all read</button>}
                  </div>

                  <div className="notif-content">
                    {error && items.length > 0 && !loading && (
                      <div className="notif-inline-error" role="alert">
                        <Icon name="alert" size={15} />
                        <span>{error}</span>
                        <button type="button" onClick={refresh} aria-label="Retry loading notifications"><Icon name="refresh" size={14} /></button>
                      </div>
                    )}
                    {loading ? (
                      <div className="notification-skeletons" aria-label="Loading notifications"><span /><span /><span /></div>
                    ) : error && !items.length ? (
                      <div className="popover-state">
                        <span className="state-icon"><Icon name="refresh" size={20} /></span>
                        <strong>Couldn’t load updates</strong>
                        <p>{error}</p>
                        <button type="button" className="btn secondary small" onClick={refresh}>Try again</button>
                      </div>
                    ) : items.length === 0 ? (
                      <div className="popover-state">
                        <span className="state-icon"><Icon name="inbox" size={21} /></span>
                        <strong>No notifications yet</strong>
                        <p>Updates from your projects will appear here.</p>
                      </div>
                    ) : (
                      <ul className="notif-list">
                        {items.map((notification) => (
                          <li key={notification.id} className={notification.isRead ? "notif" : "notif unread"}>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!notification.isRead) {
                                  const updated = await markRead(notification.id);
                                  if (!updated) return;
                                }
                                setNotificationsOpen(false);
                              }}
                            >
                              <span className="notif-indicator"><Icon name={notification.isRead ? "check" : "bell"} size={13} /></span>
                              <span className="notif-copy">
                                <strong>{notification.message}</strong>
                                <span>{notification.projectName && <em>{notification.projectName}</em>}{timeAgo(notification.createdAt)}</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="nav-divider" />

            <div className="popover-anchor" ref={profileRef}>
              <button
                ref={profileButtonRef}
                type="button"
                className={`profile-trigger ${profileOpen ? "is-active" : ""}`}
                onClick={() => {
                  setProfileOpen((open) => !open);
                  setNotificationsOpen(false);
                }}
                aria-label="Open account menu"
                aria-expanded={profileOpen}
                aria-haspopup="menu"
              >
                <Avatar name={user.name} color={user.avatarColor} size={36} decorative />
                <span className="profile-summary"><strong>{user.name}</strong><small>{roleLabel(user.role)}</small></span>
                <Icon name="chevronDown" size={14} />
              </button>

              {profileOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-head">
                    <Avatar name={user.name} color={user.avatarColor} size={42} decorative />
                    <div><strong>{user.name}</strong><span>{user.email}</span></div>
                  </div>
                  <div className="profile-role"><Icon name="shield" size={14} /> {roleLabel(user.role)} workspace</div>
                  <button type="button" role="menuitem" className="profile-menu-item danger" onClick={handleLogout}><Icon name="logout" size={17} />Sign out</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="command-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSearch(); }}>
          <div className="command-palette" role="dialog" aria-modal="true" aria-label="Quick find">
            <div className="command-search-row">
              <Icon name="search" size={19} />
              <input ref={searchInputRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search projects or jump to a command..." aria-label="Search projects" role="combobox" aria-expanded="true" aria-controls="global-command-results" aria-activedescendant={commandItems[commandIndex]?.type === "project" ? `global-command-project-${commandItems[commandIndex].project.id}` : "global-command-create"} />
              <button type="button" className="icon-btn" onClick={closeSearch} aria-label="Close quick find"><Icon name="close" size={17} /></button>
            </div>
            <div id="global-command-results" className="command-results" role="listbox">
              <button id="global-command-create" ref={(element) => { commandItemRefs.current[0] = element; }} type="button" className={`command-item ${commandIndex === 0 ? "active" : ""}`} onClick={goToCreateProject} onMouseEnter={() => setCommandIndex(0)} role="option" aria-selected={commandIndex === 0}>
                <span className="command-item-icon indigo"><Icon name="plus" size={16} /></span>
                <span><strong>Create a project</strong><small>Start a new workspace for your team</small></span>
                <kbd>↵</kbd>
              </button>
              <div className="command-divider"><span>Projects</span></div>
              {matchingProjects.map((project, index) => (
                <button id={`global-command-project-${project.id}`} ref={(element) => { commandItemRefs.current[index + 1] = element; }} type="button" className={`command-item ${commandIndex === index + 1 ? "active" : ""}`} key={project.id} onClick={() => goToProject(project.id)} onMouseEnter={() => setCommandIndex(index + 1)} role="option" aria-selected={commandIndex === index + 1}>
                  <span className="command-project-mark" style={{ "--project-accent": projectAccent(project.id) }}>{initials(project.name)}</span>
                  <span><strong>{project.name}</strong><small>{project.taskCount || 0} tasks · Updated {timeAgo(project.updatedAt) || "recently"}</small></span>
                  <Icon name="arrowUpRight" size={15} />
                </button>
              ))}
              {matchingProjects.length === 0 && <div className="command-empty"><Icon name="search" size={20} /><span>No matching projects</span></div>}
            </div>
            <div className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>Esc</kbd> to close</span></div>
          </div>
        </div>
      )}
    </>
  );
}
