import { useEffect, useState } from "react";
import Icon from "./Icon";

function ToastItem({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false;
  useEffect(() => {
    if (leaving) {
      const t = setTimeout(onDismiss, 220);
      return () => clearTimeout(t);
    }
  }, [leaving, onDismiss]);

  const iconName = toast.type === "error" ? "alert" : "check";
  return (
    <div
      className={`toast ${toast.type} ${leaving ? "leaving" : ""}`}
      role="status"
      onMouseEnter={() => toast.pause && toast.pause()}
      onMouseLeave={() => toast.resume && toast.resume()}
    >
      <span className="toast-icon">
        <Icon name={iconName} size={16} />
      </span>
      <span className="toast-msg">{toast.message}</span>
      <button className="toast-close" onClick={() => onDismiss()} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack" aria-live="polite">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}