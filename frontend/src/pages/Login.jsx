import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import Spinner from "../components/Spinner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="logo-dot large" />
          <h1>TaskFlow</h1>
          <p className="muted">Collaborative project &amp; task management</p>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoFocus
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" className="btn primary block" disabled={submitting}>
            {submitting ? <Spinner /> : "Sign in"}
          </button>
        </form>
        <p className="muted center">
          New here? <Link to="/register">Create an account</Link>
        </p>
        <div className="demo-creds">
          <small className="muted">
            Demo: srisai@taskflow.dev / Demo@123 &nbsp;·&nbsp; admin@taskflow.dev / Admin@123
          </small>
        </div>
      </div>
    </div>
  );
}