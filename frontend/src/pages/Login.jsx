import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(email.trim(), password);
      const destination = location.state?.from;
      navigate(destination?.pathname ? `${destination.pathname}${destination.search || ""}` : "/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const useDemo = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError("");
  };

  return (
    <main className="auth-page">
      <div className="auth-layout">
        <section className="auth-showcase" aria-label="TaskFlow product overview">
          <Link to="/login" state={location.state} className="brand brand-inverse">
            <span className="brand-mark"><Icon name="check" size={18} strokeWidth={2.5} /></span>
            <span className="brand-copy"><strong>TaskFlow</strong><small>Project workspace</small></span>
          </Link>

          <div className="auth-showcase-copy">
            <span className="eyebrow inverse"><Icon name="sparkles" size={14} /> Clarity for every team</span>
            <h1>Turn ambitious plans into steady progress.</h1>
            <p>Plan projects, align priorities, and move work forward from one focused workspace built for modern teams.</p>
            <div className="auth-features">
              <span><Icon name="layers" size={17} /> Visual project boards</span>
              <span><Icon name="target" size={17} /> Live delivery insights</span>
              <span><Icon name="users" size={17} /> Effortless collaboration</span>
            </div>
          </div>

          <div className="auth-preview" aria-hidden="true">
            <div className="preview-topbar"><span /><span /><span /></div>
            <div className="preview-body">
              <div className="preview-sidebar">
                <span className="preview-logo"><Icon name="check" size={15} /></span>
                <i /><i /><i /><i />
              </div>
              <div className="preview-content">
                <div className="preview-heading"><span /><b /></div>
                <div className="preview-stats"><i /><i /><i /></div>
                <div className="preview-board">
                  <div><span /><i /><i /></div>
                  <div><span /><i /><i /></div>
                  <div><span /><i /><i /></div>
                </div>
              </div>
            </div>
          </div>

          <p className="auth-showcase-foot"><Icon name="shield" size={15} /> One secure home for your team’s work</p>
        </section>

        <section className="auth-panel" aria-labelledby="login-title">
          <div className="auth-form-wrap">
            <Link to="/login" state={location.state} className="brand auth-mobile-brand">
              <span className="brand-mark"><Icon name="check" size={18} strokeWidth={2.5} /></span>
              <span className="brand-copy"><strong>TaskFlow</strong></span>
            </Link>

            <div className="auth-heading">
              <span className="eyebrow">Welcome back</span>
              <h2 id="login-title">Sign in to your workspace</h2>
              <p>Enter your details to pick up where your team left off.</p>
            </div>

            <form className="form auth-form" onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="login-email">Email address</label>
                <div className="input-shell">
                  <Icon name="mail" size={18} />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="login-password">Password</label>
                <div className="input-shell">
                  <Icon name="lock" size={18} />
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="input-action"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <Icon name={showPassword ? "eyeOff" : "eye"} size={18} />
                  </button>
                </div>
              </div>

              {error && <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>}

              <button type="submit" className="btn primary block auth-submit" disabled={submitting}>
                {submitting && <Spinner label="Signing in" />}
                <span>{submitting ? "Signing in..." : "Sign in"}</span>
                {!submitting && <Icon name="arrowRight" size={17} />}
              </button>
            </form>

            <div className="demo-access">
              <div className="demo-access-head">
                <span>Demo access</span>
                <em>Choose an account to fill credentials</em>
              </div>
              <div className="demo-accounts">
                <button type="button" onClick={() => useDemo("srisai@taskflow.dev", "Demo@123")}>
                  <span className="demo-avatar violet">S</span>
                  <span><strong>Standard user</strong><small>srisai@taskflow.dev</small></span>
                  <Icon name="chevronRight" size={16} />
                </button>
                <button type="button" onClick={() => useDemo("admin@taskflow.dev", "Admin@123")}>
                  <span className="demo-avatar blue">A</span>
                  <span><strong>Administrator</strong><small>admin@taskflow.dev</small></span>
                  <Icon name="chevronRight" size={16} />
                </button>
              </div>
            </div>

            <p className="auth-switch">New to TaskFlow? <Link to="/register" state={location.state}>Create your account</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
