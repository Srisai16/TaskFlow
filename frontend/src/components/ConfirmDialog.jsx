import { useEffect } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";

export default function ConfirmDialog({
  open,
  title = "Are you sure?",
  message = "",
  confirmLabel = "Confirm",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
      if (e.key === "Enter" && !busy) onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel, onConfirm]);

  if (!open) return null;

  return (
    <Modal title={title} onClose={onCancel}>
      <div className="confirm-body">
        {message && <p className="muted">{message}</p>}
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? "danger" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? <Spinner /> : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}