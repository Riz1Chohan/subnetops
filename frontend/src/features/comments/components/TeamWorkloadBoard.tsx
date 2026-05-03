import { useMemo } from "react";
import type { ProjectComment } from "../../../lib/types";

function flatten(items: ProjectComment[]) {
  const rows: ProjectComment[] = [];
  for (const item of items) {
    rows.push(item);
    for (const reply of item.replies || []) rows.push(reply as ProjectComment);
  }
  return rows;
}

function isOverdue(comment: ProjectComment) {
  if (!comment.dueDate || comment.taskStatus === "DONE") return false;
  return new Date(comment.dueDate).getTime() < Date.now();
}

export function TeamWorkloadBoard({ comments }: { comments: ProjectComment[] }) {
  const groups = useMemo(() => {
    const source = flatten(comments).filter((item) => item.assignedTo);
    const map = new Map<string, { label: string; total: number; overdue: number; open: number }>();
    for (const item of source) {
      const key = item.assignedTo?.id || "unassigned";
      const existing = map.get(key) || { label: item.assignedTo?.fullName || item.assignedTo?.email || "Unassigned", total: 0, overdue: 0, open: 0 };
      existing.total += 1;
      if (item.taskStatus !== "DONE") existing.open += 1;
      if (isOverdue(item)) existing.overdue += 1;
      map.set(key, existing);
    }
    return Array.from(map.values()).sort((a, b) => b.open - a.open);
  }, [comments]);

  return (
    <div className="panel">
      <h2 style={{ marginTop: 0 }}>Team Workload</h2>
      <div className="grid-cards">
        {groups.map((group) => (
          <div key={group.label} className="validation-card">
            <strong>{group.label}</strong>
            <p className="muted" style={{ margin: "6px 0" }}>Open: {group.open} • Total: {group.total}</p>
            <span className={group.overdue > 0 ? "badge badge-error" : "badge badge-info"}>Overdue: {group.overdue}</span>
          </div>
        ))}
        {groups.length === 0 ? <p className="muted">No assigned review work yet.</p> : null}
      </div>
    </div>
  );
}
