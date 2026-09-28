import { STATUS_META, PRIORITY_META } from "./format";

export const ISSUE_TYPES = {
  TASK: {
    id: "TASK",
    label: "Task",
    icon: "checkSquare",
    color: "#3b82f6",
    bg: "rgba(59, 130, 246, 0.12)",
    border: "rgba(59, 130, 246, 0.3)",
  },
  STORY: {
    id: "STORY",
    label: "Story",
    icon: "bookmark",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    border: "rgba(16, 185, 129, 0.3)",
  },
  BUG: {
    id: "BUG",
    label: "Bug",
    icon: "alert",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    border: "rgba(239, 68, 68, 0.3)",
  },
  EPIC: {
    id: "EPIC",
    label: "Epic",
    icon: "zap",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    border: "rgba(139, 92, 246, 0.3)",
  },
  IMPROVEMENT: {
    id: "IMPROVEMENT",
    label: "Improvement",
    icon: "trendingUp",
    color: "#06b6d4",
    bg: "rgba(6, 182, 212, 0.12)",
    border: "rgba(6, 182, 212, 0.3)",
  },
};

export const ISSUE_TYPE_LIST = Object.values(ISSUE_TYPES);

export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21];

export const MEMBER_ROLES = [
  { id: "ADMIN", label: "Admin", desc: "Full workspace & project permissions" },
  { id: "PROJECT_LEAD", label: "Project Lead", desc: "Manages sprints, board, and member assignments" },
  { id: "DEVELOPER", label: "Developer", desc: "Creates, updates, and completes issues" },
  { id: "DESIGNER", label: "Designer", desc: "Designs specs and handles UI/UX tasks" },
  { id: "QA_ENGINEER", label: "QA / Tester", desc: "Verifies bug fixes and reviews deliverables" },
  { id: "PRODUCT_OWNER", label: "Product Owner", desc: "Defines requirements and priorities" },
  { id: "SCRUM_MASTER", label: "Scrum Master", desc: "Facilitates delivery workflow and sprint ceremonies" },
  { id: "VIEWER", label: "Viewer", desc: "Read-only access to board and timeline" },
];

export const MEMBER_DEPARTMENTS = [
  "Engineering",
  "Product & Design",
  "Quality Assurance",
  "DevOps & Infrastructure",
  "Data & AI",
  "Operations",
];

export const MEMBER_STATUSES = [
  { id: "ACTIVE", label: "Active", dot: "#10b981" },
  { id: "FOCUSING", label: "In Focus", dot: "#6366f1" },
  { id: "IN_MEETING", label: "In Meeting", dot: "#f59e0b" },
  { id: "AWAY", label: "Away", dot: "#94a3b8" },
  { id: "ON_LEAVE", label: "On Leave", dot: "#ef4444" },
];

export const PRESET_LABELS = [
  { name: "Frontend", color: "#6366f1" },
  { name: "Backend", color: "#3b82f6" },
  { name: "API", color: "#06b6d4" },
  { name: "UI/UX", color: "#ec4899" },
  { name: "Security", color: "#ef4444" },
  { name: "Performance", color: "#f59e0b" },
  { name: "Database", color: "#8b5cf6" },
  { name: "DevOps", color: "#10b981" },
];

const META_REGEX = /<!--tf_meta:([\s\S]*?)-->/;

/**
 * Parses raw task description and extracts embedded Jira metadata.
 */
export function parseTaskMetadata(task) {
  if (!task) return { cleanDescription: "", meta: getEmptyMeta() };

  const raw = task.description || "";
  const match = raw.match(META_REGEX);

  let meta = getEmptyMeta();
  let cleanDescription = raw;

  if (match && match[1]) {
    try {
      const parsed = JSON.parse(match[1]);
      meta = {
        ...meta,
        ...parsed,
        subtasks: Array.isArray(parsed.subtasks) ? parsed.subtasks : [],
        labels: Array.isArray(parsed.labels) ? parsed.labels : [],
      };
      cleanDescription = raw.replace(META_REGEX, "").trim();
    } catch {
      cleanDescription = raw;
    }
  }

  // Assign issue key (e.g. TF-101)
  const issueKey = task.id ? `TF-${task.id}` : "TF-NEW";

  return {
    cleanDescription,
    meta: {
      ...meta,
      issueType: meta.issueType || (task.title?.toLowerCase().includes("bug") || task.title?.toLowerCase().includes("fix") ? "BUG" : "TASK"),
      storyPoints: meta.storyPoints ?? (task.priority === "URGENT" ? 5 : task.priority === "HIGH" ? 3 : 2),
      sprint: meta.sprint || "active",
      issueKey,
    },
  };
}

function getEmptyMeta() {
  return {
    issueType: "TASK",
    storyPoints: 2,
    subtasks: [],
    labels: [],
    sprint: "active",
    startDate: "",
    estimatedHours: 8,
  };
}

/**
 * Serializes clean description and metadata into payload string for backend storage
 */
export function serializeTaskDescription(cleanDescription, meta) {
  const metaString = JSON.stringify({
    issueType: meta.issueType || "TASK",
    storyPoints: Number(meta.storyPoints) || 0,
    subtasks: meta.subtasks || [],
    labels: meta.labels || [],
    sprint: meta.sprint || "active",
    startDate: meta.startDate || "",
    estimatedHours: Number(meta.estimatedHours) || 0,
  });

  const clean = (cleanDescription || "").trim();
  const serialized = `<!--tf_meta:${metaString}-->\n${clean}`.trim();

  // If exceeding length limit of 2000 chars, truncate cleanly
  if (serialized.length > 2000) {
    const header = `<!--tf_meta:${metaString}-->\n`;
    const remaining = Math.max(0, 2000 - header.length - 3);
    return `${header}${clean.slice(0, remaining)}...`;
  }

  return serialized;
}

/**
 * Workspace Member Details Persistence Helper
 */
const MEMBER_STORAGE_PREFIX = "tf_member_profile_";

export function getStoredMemberDetails(memberId, defaultMember = {}) {
  if (!memberId) return defaultMember;
  try {
    const raw = localStorage.getItem(`${MEMBER_STORAGE_PREFIX}${memberId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultMember, ...parsed };
    }
  } catch {
    // ignore
  }

  return {
    ...defaultMember,
    title: defaultMember.role === "ADMIN" ? "Engineering Director" : "Senior Full-Stack Engineer",
    department: "Engineering",
    workRole: defaultMember.role || "DEVELOPER",
    capacityHours: 40,
    status: "ACTIVE",
    skills: ["Java", "React", "Spring Boot", "SQL"],
    bio: "Core contributor working on platform deliverables and feature velocity.",
  };
}

export function saveStoredMemberDetails(memberId, details) {
  if (!memberId) return;
  try {
    const current = getStoredMemberDetails(memberId);
    const updated = { ...current, ...details };
    localStorage.setItem(`${MEMBER_STORAGE_PREFIX}${memberId}`, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("taskflow:member-updated", { detail: { memberId, details: updated } }));
    return updated;
  } catch {
    // ignore
  }
}

/**
 * Export tasks as CSV format
 */
export function exportTasksToCSV(projectName, tasks) {
  const headers = ["Issue Key", "Title", "Type", "Status", "Priority", "Assignee", "Story Points", "Due Date", "Subtasks Done", "Subtasks Total", "Labels"];
  const rows = tasks.map((task) => {
    const { meta } = parseTaskMetadata(task);
    const subtasksDone = meta.subtasks.filter((s) => s.done).length;
    const subtasksTotal = meta.subtasks.length;
    const labels = meta.labels.join("; ");
    return [
      `TF-${task.id}`,
      `"${(task.title || "").replace(/"/g, '""')}"`,
      meta.issueType,
      task.status,
      task.priority,
      `"${(task.assigneeName || "Unassigned").replace(/"/g, '""')}"`,
      meta.storyPoints || 0,
      task.dueDate || "",
      subtasksDone,
      subtasksTotal,
      `"${labels}"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${(projectName || "project").toLowerCase().replace(/\s+/g, "_")}_jira_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export full project state as JSON
 */
export function exportProjectToJSON(project, tasks, members) {
  const exportData = {
    exportedAt: new Date().toISOString(),
    project,
    members,
    tasks: tasks.map((t) => {
      const { cleanDescription, meta } = parseTaskMetadata(t);
      return {
        ...t,
        description: cleanDescription,
        jiraMetadata: meta,
      };
    }),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${(project?.name || "project").toLowerCase().replace(/\s+/g, "_")}_backup.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
