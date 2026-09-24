import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import Avatar from "./Avatar";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { items, unread, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="brand">
          <span className="logo-dot" />
          TaskFlow
        </Link>
      </div>

      <div className="navbar-right">
        {user && (
          <>
            <div className="bell-wrap">
              <button
                className="icon-btn bell"
                onClick={() => {
                  setOpen((o) => !o);
                  if (open) setOpen(false);
                }}
                aria-label="Notifications"
              >
                &#128276;
                {unread > 0 && <span className="badge">{unread}</span>}
              </button>
              {open && (
                <div className="notif-panel">
                  <div className="notif-head">
                    <strong>Notifications</strong>
                    {unread > 0 && (
                      <button className="link-btn" onClick={markAllRead}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  {items.length === 0 ? (
                    <p className="muted">No notifications yet.</p>
                  ) : (
                    <ul>
                      {items.map((n) => (
                        <li
                          key={n.id}
                          className={n.isRead ? "notif" : "notif unread"}
                          onClick={() => !n.isRead && markRead(n.id)}
                        >
                          <div className="notif-msg">{n.message}</div>
                          <div className="notif-meta">
                            {n.projectName && <span>{n.projectName}</span>}
                            <span>{new Date(n.createdAt).toLocaleString()}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div className="nav-user">
              <Avatar name={user.name} color={user.avatarColor} />
              <div className="nav-user-text">
                <span>{user.name}</span>
                <small>{user.role}</small>
              </div>
              <button className="link-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}