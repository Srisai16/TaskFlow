const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function toDate(input) {
  if (!input) return null;
  const value = String(input);
  const match = value.match(DATE_ONLY);
  const date = match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function timeAgo(input, now = new Date()) {
  const date = toDate(input);
  if (!date) return "";
  const diff = Math.max(0, now.getTime() - date.getTime());
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;
  return formatDate(input);
}

export function formatDate(input) {
  const date = toDate(input);
  if (!date) return "No date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  });
}

export function formatDateTime(input) {
  const date = toDate(input);
  if (!date) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dueStatus(dueDate, status) {
  if (!dueDate) return { label: "", className: "" };
  if (status === "DONE") return { label: "Completed", className: "done" };
  const due = toDate(dueDate);
  if (!due) return { label: "", className: "" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, className: "overdue" };
  if (days === 0) return { label: "Due today", className: "soon" };
  if (days === 1) return { label: "Due tomorrow", className: "soon" };
  if (days <= 7) return { label: `Due in ${days}d`, className: "soon" };
  return { label: formatDate(dueDate), className: "" };
}

export const STATUS_META = {
  TODO: { label: "To Do", shortLabel: "To Do", className: "status-todo", next: "IN_PROGRESS" },
  IN_PROGRESS: { label: "In Progress", shortLabel: "In progress", className: "status-progress", next: "IN_REVIEW" },
  IN_REVIEW: { label: "In Review", shortLabel: "In review", className: "status-review", next: "DONE" },
  DONE: { label: "Done", shortLabel: "Done", className: "status-done", next: null },
};

export const STATUSES = Object.entries(STATUS_META).map(([value, meta]) => ({ value, ...meta }));

export const PRIORITY_META = {
  URGENT: { label: "Urgent", weight: 3, className: "prio-urgent" },
  HIGH: { label: "High", weight: 2, className: "prio-high" },
  MEDIUM: { label: "Medium", weight: 1, className: "prio-medium" },
  LOW: { label: "Low", weight: 0, className: "prio-low" },
};

export const PRIORITIES = Object.entries(PRIORITY_META).map(([value, meta]) => ({ value, ...meta }));

export const ACCENTS = ["#5b5ce2", "#0284c7", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#0d9488"];

export function projectAccent(id) {
  return ACCENTS[Math.abs(Number(id) || 0) % ACCENTS.length];
}

export function initials(name) {
  return (name || "?")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}
