export default function Avatar({ name, color, size = 32 }) {
  const initials = (name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  return (
    <span
      className="avatar"
      style={{ background: color || "#64748b", width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials}
    </span>
  );
}