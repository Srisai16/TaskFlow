import { useState } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";
import { PRIORITIES, STATUSES } from "../utils/format";

export default function TaskFormModal({
  task,
  defaultStatus,
  members,
  onSubmit,
  onClose,
  submitting,
  error = "",
  children,
}) {
  const editing = Boolean(task);
  const [form, setForm] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || defaultStatus || "TODO",
    priority: task?.priority || "MEDIUM",
    dueDate: task?.dueDate || "",
    assigneeId: task?.assigneeId || "",
  });
  const busy = Boolean(submitting);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description.trim() || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
    });
  };

  return (
    <Modal
      title={editing ? "Edit task" : "Create a new task"}
      description={editing ? "Update ownership, priority, and delivery details." : "Add a clear, actionable step to the board."}
      onClose={onClose}
      closeDisabled={busy}
    >
      <form className="form" onSubmit={submit}>
        <div className="form-field">
          <div className="field-label-row"><label htmlFor="task-title">Task title</label><span>{form.title.length}/150</span></div>
          <input
            id="task-title"
            value={form.title}
            onChange={set("title")}
            placeholder="What needs to be done?"
            maxLength={150}
            required
            data-modal-initial-focus
          />
        </div>

        <div className="form-field">
          <div className="field-label-row"><label htmlFor="task-description">Description</label><span>Optional</span></div>
          <textarea
            id="task-description"
            value={form.description}
            onChange={set("description")}
            placeholder="Add context, acceptance criteria, or useful links"
            rows={4}
            maxLength={2000}
          />
          <span className="field-hint align-right">{form.description.length}/2000</span>
        </div>

        <div className="form-grid">
          <div className="form-field">
            <label htmlFor="task-status">Status</label>
            <select id="task-status" value={form.status} onChange={set("status")}>
              {STATUSES.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="task-priority">Priority</label>
            <select id="task-priority" value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((priority) => <option key={priority.value} value={priority.value}>{priority.label}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="task-due-date">Due date</label>
            <input id="task-due-date" type="date" value={form.dueDate} onChange={set("dueDate")} />
          </div>
          <div className="form-field">
            <label htmlFor="task-assignee">Assignee</label>
            <select id="task-assignee" value={form.assigneeId} onChange={set("assigneeId")}>
              <option value="">Unassigned</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </div>
        </div>

        {error && <div className="alert error" role="alert"><span className="alert-icon">!</span><span>{error}</span></div>}

        <div className={`form-actions ${children ? "with-danger" : ""}`}>
          {children && <div className="form-danger-action">{children}</div>}
          <div className="form-action-group">
            <button type="button" className="btn secondary" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="submit" className="btn primary" disabled={busy || !form.title.trim()}>
              {busy && <Spinner label={editing ? "Saving task" : "Creating task"} />}
              <span>{busy ? (editing ? "Saving..." : "Creating...") : editing ? "Save changes" : "Create task"}</span>
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
