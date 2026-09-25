export default function Spinner({ label = "Loading", className = "", plain = false }) {
  return (
    <span
      className={`spinner ${plain ? "plain" : ""} ${className}`.trim()}
      role="status"
      aria-label={label}
    />
  );
}
