import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getErrorMessage } from "../api/client";
import Spinner from "../components/Spinner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await register(name, email, password);
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
          <p className="muted">Create your account</p>
        </div>
        <form className="form" onSubmit={submit}>
          <label>
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoFocus
              required
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              required
            />
          </label>
          {error && <div className="alert error">{error}</div>}
          <button type="submit" className="btn primary block" disabled={submitting}>
            {submitting ? <Spinner /> : "Create account"}
          </button>
        </form>
        <p className="muted center">
          Already registered? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}