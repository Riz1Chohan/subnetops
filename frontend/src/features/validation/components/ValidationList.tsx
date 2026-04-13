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
  openTaskBodies,
  emptyTitle = "No validation findings",
  emptyMessage = "Run validation after adding sites or VLANs to surface overlaps, gateway issues, and sizing risks.",
}: {
  items: ValidationResult[];
  onConvertToTask?: (item: ValidationResult) => void;
  onExplain?: (item: ValidationResult) => void;
  openTaskBodies?: Set<string>;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => {
        const taskBody = `[Validation] ${item.title} — ${item.message}`;
        const alreadyTracked = openTaskBodies?.has(taskBody);

        return (
          <div key={item.id} className="validation-card">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span className={badgeClass(item.severity)}>{item.severity}</span>
              <span className="badge-soft">{item.entityType}</span>
              <span className="badge-soft">{item.ruleCode}</span>
              {alreadyTracked ? <span className="badge-soft">Task already exists</span> : null}
            </div>
            <h4 style={{ marginBottom: 8 }}>{item.title}</h4>
            <p style={{ margin: 0 }}>{item.message}</p>
            {onConvertToTask || onExplain ? (
              <div className="form-actions">
                {onConvertToTask ? <button type="button" onClick={() => onConvertToTask(item)} disabled={alreadyTracked}>Convert to Task</button> : null}
                {onExplain ? <button type="button" onClick={() => onExplain(item)}>Explain with AI</button> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
