import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  let idCounter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (message, type = "success", { ttl = 3800 } = {}) => {
      const id = ++idCounter.current;
      setToasts((prev) => [...prev, { id, message, type }]);
      const timer = setTimeout(() => dismiss(id), type === "error" ? 6000 : ttl);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const success = useCallback((m) => toast(m, "success"), [toast]);
  const error = useCallback((m) => toast(m, "error"), [toast]);
  const info = useCallback((m) => toast(m, "info"), [toast]);

  useEffect(() => {
    const timersRef = timers;
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const ICON_BY_TYPE = { success: "check", error: "alert", info: "bell" };

  return (
    <ToastContext.Provider value={{ toast, success, error, info, dismiss }}>
      {children}
      <div className="toast-stack" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`} role="status">
            <span className="toast-icon">
              <Icon name={ICON_BY_TYPE[t.type]} size={16} />
            </span>
            <span className="toast-msg">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={13} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
