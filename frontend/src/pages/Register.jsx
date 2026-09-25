import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Icon from "../components/Icon";
import Spinner from "../components/Spinner";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
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
      await register(name.trim(), email.trim(), password);
      const destination = location.state?.from;
      navigate(destination?.pathname ? `${destination.pathname}${destination.search || ""}` : "/", { replace: true });
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
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
            <span className="eyebrow inverse"><Icon name="sparkles" size={14} /> Your work, in flow</span>
            <h1>Build a workspace your whole team can trust.</h1>
            <p>Give every project a clear owner, every task a next step, and every team a shared view of progress.</p>
            <div className="auth-features">
              <span><Icon name="checkCircle" size={17} /> Clear priorities</span>
              <span><Icon name="grid" size={17} /> Focused workflows</span>
              <span><Icon name="users" size={17} /> Shared ownership</span>
            </div>
          </div>

          <div className="auth-preview auth-preview-register" aria-hidden="true">
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

          <p className="auth-showcase-foot"><Icon name="shield" size={15} /> Built for focused, secure collaboration</p>
        </section>

        <section className="auth-panel" aria-labelledby="register-title">
          <div className="auth-form-wrap">
            <Link to="/login" state={location.state} className="brand auth-mobile-brand">
              <span className="brand-mark"><Icon name="check" size={18} strokeWidth={2.5} /></span>
              <span className="brand-copy"><strong>TaskFlow</strong></span>
            </Link>

            <div className="auth-heading">
              <span className="eyebrow">Start collaborating</span>
              <h2 id="register-title">Create your account</h2>
              <p>Set up your workspace in less than a minute.</p>
            </div>

            <form className="form auth-form" onSubmit={submit}>
              <div className="form-field">
                <label htmlFor="register-name">Full name</label>
                <div className="input-shell">
                  <Icon name="user" size={18} />
                  <input
                    id="register-name"
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    autoFocus
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="register-email">Work email</label>
                <div className="input-shell">
                  <Icon name="mail" size={18} />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="register-password">Password</label>
                <div className="input-shell">
                  <Icon name="lock" size={18} />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Create a secure password"
                    autoComplete="new-password"
                    minLength={6}
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
                <span className="field-hint"><Icon name="shield" size={13} /> Use at least 6 characters</span>
              </div>

              {error && <div className="alert error" role="alert"><Icon name="alert" size={18} /><span>{error}</span></div>}

              <button type="submit" className="btn primary block auth-submit" disabled={submitting}>
                {submitting && <Spinner label="Creating account" />}
                <span>{submitting ? "Creating account..." : "Create account"}</span>
                {!submitting && <Icon name="arrowRight" size={17} />}
              </button>

              <p className="terms-note">By creating an account, you agree to use TaskFlow responsibly and keep project information confidential.</p>
            </form>

            <p className="auth-switch">Already have an account? <Link to="/login" state={location.state}>Sign in</Link></p>
          </div>
        </section>
      </div>
    </main>
  );
}
