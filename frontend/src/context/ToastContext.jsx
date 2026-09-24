import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

let seq = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, type = "success", opts = {}) => {
      const id = ++seq;
      setToasts((prev) => [...prev, { id, message, type }]);
      const ttl = opts.ttl || (type === "error" ? 6000 : 3500);
      const timer = setTimeout(() => dismiss(id), ttl);
      timers.current.set(id, timer);
      return id;
    },
    [dismiss]
  );

  const success = useCallback((m, o) => push(m, "success", o), [push]);
  const error = useCallback((m, o) => push(m, "error", o), [push]);
  const info = useCallback((m, o) => push(m, "info", o), [push]);

  return (
    <ToastContext.Provider value={{ success, error, info, dismiss }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            {t.message}
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}