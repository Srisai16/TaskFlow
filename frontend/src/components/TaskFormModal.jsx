import { useState } from "react";
import Modal from "./Modal";
import Spinner from "./Spinner";

const STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function TaskFormModal({
  task,
  defaultStatus,
  members,
  onSubmit,
  onClose,
  submitting,
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

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      title: form.title.trim(),
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      assigneeId: form.assigneeId ? Number(form.assigneeId) : null,
    });
  };

  return (
    <Modal title={editing ? "Edit Task" : "New Task"} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Title <span className="req">*</span>
          <input
            value={form.title}
            onChange={set("title")}
            placeholder="What needs to be done?"
            maxLength={150}
            autoFocus
          />
        </label>

        <label>
          Description
          <textarea
            value={form.description}
            onChange={set("description")}
            rows={3}
            placeholder="Optional details"
          />
        </label>

        <div className="form-row">
          <label>
            Status
            <select value={form.status} onChange={set("status")}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Due date
            <input type="date" value={form.dueDate} onChange={set("dueDate")} />
          </label>
          <label>
            Assignee
            <select value={form.assigneeId} onChange={set("assigneeId")}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-actions">
          {children}
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={submitting || !form.title.trim()}>
            {submitting ? <Spinner /> : editing ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}