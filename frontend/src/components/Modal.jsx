import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export default function Modal({
  title,
  description,
  children,
  onClose,
  size = "default",
  closeDisabled = false,
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);
  closeRef.current = onClose;
  closeDisabledRef.current = closeDisabled;

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current;
      const preferred = dialog?.querySelector("[data-modal-initial-focus]");
      const first = dialog?.querySelector(FOCUSABLE);
      (preferred || first || dialog)?.focus();
    });

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (!closeDisabledRef.current) closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const elements = Array.from(dialog?.querySelectorAll(FOCUSABLE) || []).filter(
        (element) => element.offsetParent !== null
      );
      if (!elements.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, []);

  const requestClose = () => {
    if (!closeDisabledRef.current) closeRef.current();
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`modal modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={requestClose}
            disabled={closeDisabled}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}
