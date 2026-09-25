import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";

const ICONS = { success: "checkCircle", error: "alert", info: "info", warning: "alert" };

function ToastItem({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const hovered = useRef(false);
  const focused = useRef(false);
  const handleDismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);

  useEffect(() => {
    if (!leaving) return undefined;
    const timer = setTimeout(handleDismiss, 220);
    return () => clearTimeout(timer);
  }, [handleDismiss, leaving]);

  const resume = () => {
    if (!leaving && !hovered.current && !focused.current) toast.resume?.();
  };

  return (
    <div
      className={`toast toast-${toast.type} ${leaving ? "leaving" : ""}`}
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={() => {
        hovered.current = true;
        toast.pause?.();
      }}
      onMouseLeave={() => {
        hovered.current = false;
        resume();
      }}
      onFocusCapture={() => {
        focused.current = true;
        toast.pause?.();
      }}
      onBlurCapture={(event) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        focused.current = false;
        resume();
      }}
    >
      <span className="toast-icon">
        <Icon name={ICONS[toast.type] || ICONS.info} size={18} />
      </span>
      <div className="toast-copy">
        <strong>{toast.type === "error" ? "Something went wrong" : toast.type === "success" ? "Done" : "TaskFlow"}</strong>
        <span>{toast.message}</span>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={() => setLeaving(true)}
        aria-label="Dismiss notification"
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
