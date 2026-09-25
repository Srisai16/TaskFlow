import Modal from "./Modal";
import Spinner from "./Spinner";
import Icon from "./Icon";

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
  if (!open) return null;

  return (
    <Modal
      title={title}
      onClose={onCancel}
      size="small"
      closeDisabled={busy}
    >
      <div className="confirm-body">
        <div className={`confirm-icon ${danger ? "danger" : "info"}`}>
          <Icon name={danger ? "trash" : "info"} size={20} />
        </div>
        <p className="confirm-message">{message}</p>
        <div className="form-actions">
          <button
            type="button"
            className="btn secondary"
            onClick={onCancel}
            disabled={busy}
            data-modal-initial-focus
          >
            Cancel
          </button>
          <button
            type="button"
            className={`btn ${danger ? "danger-solid" : "primary"}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Spinner label="Processing" />}
            <span>{busy ? "Working..." : confirmLabel}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
