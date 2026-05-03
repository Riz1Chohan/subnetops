import { Link } from "react-router-dom";
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
  getFixPath,
  getFixLabel,
  emptyTitle = "No validation findings",
  emptyMessage = "Run validation after adding sites or VLANs to surface overlaps, gateway issues, and sizing risks.",
}: {
  items: ValidationResult[];
  onConvertToTask?: (item: ValidationResult) => void;
  onExplain?: (item: ValidationResult) => void;
  openTaskBodies?: Set<string>;
  getFixPath?: (item: ValidationResult) => string | undefined;
  getFixLabel?: (item: ValidationResult) => string | undefined;
  emptyTitle?: string;
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} message={emptyMessage} />;
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {items.map((item) => {
        const taskBody = `[Validation] ${item.title} — ${item.issue || item.message}`;
        const alreadyTracked = openTaskBodies?.has(taskBody);
        const fixPath = getFixPath?.(item);
        const fixLabel = getFixLabel?.(item) || "Open fix area";

        return (
          <div key={item.id} className="validation-card">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span className={badgeClass(item.severity)}>{item.severity}</span>
              <span className="badge-soft">{item.entityType}</span>
              <span className="badge-soft">{item.ruleCode}</span>
              {alreadyTracked ? <span className="badge-soft">Task already exists</span> : null}
            </div>
            <h4 style={{ marginBottom: 8 }}>{item.title}</h4>
            {item.issue || item.impact || item.recommendation ? (
              <div className="validation-finding-body" style={{ display: "grid", gap: 8 }}>
                <p style={{ margin: 0 }}><strong>Issue:</strong> {item.issue || item.message}</p>
                {item.impact ? <p style={{ margin: 0 }}><strong>Impact:</strong> {item.impact}</p> : null}
                {item.recommendation ? <p style={{ margin: 0 }}><strong>Recommendation:</strong> {item.recommendation}</p> : null}
              </div>
            ) : (
              <p style={{ margin: 0 }}>{item.message}</p>
            )}
            {fixPath ? (
              <div className="validation-meta-row">
                <span className="muted">Need to fix this?</span>
                <Link to={fixPath} className="inline-link">{fixLabel}</Link>
              </div>
            ) : null}
            {onConvertToTask || onExplain || fixPath ? (
              <div className="form-actions">
                {fixPath ? <Link to={fixPath} className="link-button">{fixLabel}</Link> : null}
                {onExplain ? <button type="button" onClick={() => onExplain(item)}>Suggest fix</button> : null}
                {onConvertToTask ? <button type="button" onClick={() => onConvertToTask(item)} disabled={alreadyTracked}>Convert to Task</button> : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
