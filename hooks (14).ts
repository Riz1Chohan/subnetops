import type { ValidationResult } from "../../../lib/types";

function badgeClass(severity: ValidationResult["severity"]) {
  switch (severity) {
    case "ERROR":
      return "badge badge-error";
    case "WARNING":
      return "badge badge-warning";
    default:
      return "badge badge-info";
  }
}

export function ValidationList({ items, onConvertToTask }: { items: ValidationResult[]; onConvertToTask?: (item: ValidationResult) => void; }) {
  if (items.length === 0) return <p>No validation findings.</p>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <div key={item.id} className="validation-card">
          <span className={badgeClass(item.severity)}>{item.severity}</span>
          <h4 style={{ marginBottom: 8 }}>{item.title}</h4>
          <p style={{ margin: 0 }}>{item.message}</p>
          {onConvertToTask ? <div className="form-actions"><button type="button" onClick={() => onConvertToTask(item)}>Convert to Task</button></div> : null}
        </div>
      ))}
    </div>
  );
}
