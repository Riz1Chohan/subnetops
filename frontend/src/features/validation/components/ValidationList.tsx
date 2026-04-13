import { EmptyState } from "../../../components/app/EmptyState";
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

export function ValidationList({
  items,
  onConvertToTask,
  onExplain,
  emptyTitle = "No validation findings",
  emptyMessage = "Run validation after adding sites or VLANs to surface overlaps, gateway issues, and sizing risks.",
}: {
  items: ValidationResult[];
  onConvertToTask?: (item: ValidationResult) => void;
  onExplain?: (item: ValidationResult) => void;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => (
        <div key={item.id} className="validation-card">
          <span className={badgeClass(item.severity)}>{item.severity}</span>
          <h4 style={{ marginBottom: 8 }}>{item.title}</h4>
          <p style={{ margin: 0 }}>{item.message}</p>
          {onConvertToTask || onExplain ? (
            <div className="form-actions">
              {onConvertToTask ? <button type="button" onClick={() => onConvertToTask(item)}>Convert to Task</button> : null}
              {onExplain ? <button type="button" onClick={() => onExplain(item)}>Explain with AI</button> : null}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
