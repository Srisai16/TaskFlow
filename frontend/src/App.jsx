import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Project from "./pages/Project";

function Protected() {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

function GuestOnly({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/" replace /> : children;
}

function HomeRedirect() {
  const { user } = useAuth();
  return <Navigate to={user ? "/" : "/login"} replace />;
}

function ApplicationLayout() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Navbar />
      <div className="workspace-content"><Outlet /></div>
    </div>
  );
}

function RouteMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const title = pathname.startsWith("/projects/")
      ? "Project workspace · TaskFlow"
      : pathname === "/register"
        ? "Create account · TaskFlow"
        : pathname === "/login"
          ? "Sign in · TaskFlow"
          : "Workspace · TaskFlow";
    document.title = title;
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <div className="app">
      <RouteMetadata />
      <Routes>
        <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />
        <Route element={<Protected />}>
          <Route element={<ApplicationLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects/:id" element={<Project />} />
          </Route>
        </Route>
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </div>
  );
}
