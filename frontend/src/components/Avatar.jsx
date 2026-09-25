import { initials } from "../utils/format";

const COLORS = ["#5b5ce2", "#2563eb", "#0891b2", "#059669", "#d97706", "#db2777", "#7c3aed"];

function fallbackColor(name) {
  const value = (name || "").split("").reduce((sum, character) => sum + character.charCodeAt(0), 0);
  return COLORS[value % COLORS.length];
}

export default function Avatar({ name, color, size = 36, className = "", decorative = false }) {
  const label = name || "Unknown user";
  return (
    <span
      className={`avatar ${className}`.trim()}
      style={{
        background: color || fallbackColor(label),
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
      }}
      title={label}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
    >
      {initials(label)}
    </span>
  );
}
