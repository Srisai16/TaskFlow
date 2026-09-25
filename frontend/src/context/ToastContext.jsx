import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import ToastContainer from "../components/ToastContainer";

const ToastContext = createContext(null);
let sequence = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const remaining = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    remaining.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const startTimer = useCallback(
    (id, duration) => {
      const timer = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  const pause = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const resume = useCallback(
    (id) => {
      if (timers.current.has(id)) return;
      const expiresAt = remaining.current.get(id) ?? 0;
      remaining.current.delete(id);
      const duration = expiresAt - Date.now();
      if (duration > 0) startTimer(id, duration);
      else dismiss(id);
    },
    [dismiss, startTimer]
  );

  const push = useCallback(
    (message, type = "success", options = {}) => {
      const id = ++sequence;
      const requestedTtl = Number(options.ttl);
      const duration = Number.isFinite(requestedTtl)
        ? requestedTtl
        : type === "error"
          ? 6500
          : type === "warning"
            ? 5500
            : 4000;
      const toast = { id, message, type, pause: () => pause(id), resume: () => resume(id) };
      setToasts((current) => [...current, toast].slice(-4));
      remaining.current.set(id, Date.now() + duration);
      startTimer(id, duration);
      return id;
    },
    [pause, resume, startTimer]
  );

  const success = useCallback((message, options) => push(message, "success", options), [push]);
  const error = useCallback((message, options) => push(message, "error", options), [push]);
  const info = useCallback((message, options) => push(message, "info", options), [push]);
  const warning = useCallback((message, options) => push(message, "warning", options), [push]);

  useEffect(() => {
    const timerMap = timers.current;
    const timeMap = remaining.current;
    return () => {
      timerMap.forEach((timer) => clearTimeout(timer));
      timerMap.clear();
      timeMap.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ success, error, info, warning, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
