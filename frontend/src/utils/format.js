export function timeAgo(input, now = new Date()) {
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  const diff = Math.max(0, now - date);
  const s = Math.floor(diff / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w ago`;
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatDateTime(input) {
  const date = new Date(input);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

export function dueStatus(dueDate, status) {
  if (!dueDate) return { label: "", cls: "" };
  if (status === "DONE") return { label: "Done", cls: "done" };
  const today = new Date();
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due - today) / 86400000);
  if (days < 0) return { label: `${-days}d overdue`, cls: "overdue" };
  if (days === 0) return { label: "Due today", cls: "soon" };
  if (days === 1) return { label: "Due tomorrow", cls: "soon" };
  if (days <= 7) return { label: `Due in ${days}d`, cls: "soon" };
  return { label: formatDateTime(dueDate), cls: "" };
}

export const PRIORITY_META = {
  URGENT: { label: "Urgent", weight: 3 },
  HIGH: { label: "High", weight: 2 },
  MEDIUM: { label: "Medium", weight: 1 },
  LOW: { label: "Low", weight: 0 },
};

export const ACCENTS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

export function projectAccent(id) {
  return ACCENTS[Math.abs(Number(id) || 0) % ACCENTS.length];
}

export function initials(name) {
  return (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}