import { useMemo, useState } from "react";
import type { MentionSuggestion, ProjectComment, CommentTaskPriority } from "../../../lib/types";

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

function priorityBadge(priority: CommentTaskPriority) {
  if (priority === "CRITICAL") return "badge badge-error";
  if (priority === "HIGH") return "badge badge-warning";
  if (priority === "MEDIUM") return "badge badge-info";
  return "badge badge-info";
}

function agingLabel(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days >= 7) return { label: `${days}d`, className: "badge badge-error" };
  if (days >= 3) return { label: `${days}d`, className: "badge badge-warning" };
  return { label: `${days}d`, className: "badge badge-info" };
}

export function TaskBoard({ comments, currentUserId, mentionOptions = [], onBulkReassign, onQueueReminders }: { comments: ProjectComment[]; currentUserId?: string; mentionOptions?: MentionSuggestion[]; onBulkReassign?: (ids: string[], assignedToUserId: string | null) => Promise<void> | void; onQueueReminders?: () => Promise<void> | void; }) {
  const [assignedOnly, setAssignedOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState("");
  const items = useMemo(() => {
    const all = flatten(comments).filter((item) => item.assignedTo || item.dueDate || item.targetId || item.taskStatus !== "OPEN");
    return all.filter((item) => {
      if (assignedOnly && item.assignedTo?.id !== currentUserId) return false;
      if (overdueOnly && !isOverdue(item)) return false;
      return true;
    });
  }, [comments, assignedOnly, overdueOnly, currentUserId]);

  const groups = useMemo(() => ({
    OPEN: items.filter((item) => item.taskStatus === "OPEN"),
    IN_PROGRESS: items.filter((item) => item.taskStatus === "IN_PROGRESS"),
    BLOCKED: items.filter((item) => item.taskStatus === "BLOCKED"),
    DONE: items.filter((item) => item.taskStatus === "DONE"),
  }), [items]);

  return (
    <div className="panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Task Board</h2>
          <p className="muted" style={{ margin: 0 }}>Review items grouped by status.</p>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <label><input type="checkbox" checked={assignedOnly} onChange={(e) => setAssignedOnly(e.target.checked)} /> Assigned to me</label>
          <label><input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} /> Overdue only</label>
          {onQueueReminders ? <button type="button" onClick={() => void onQueueReminders()}>Queue Overdue Reminders</button> : null}
        </div>
      </div>

      {onBulkReassign ? (
        <div className="toolbar-row">
          <select value={bulkAssigneeId} onChange={(e) => setBulkAssigneeId(e.target.value)}>
            <option value="">Select assignee for selected tasks</option>
            {mentionOptions.map((item) => <option key={item.id} value={item.id}>{item.fullName || item.email}</option>)}
          </select>
          <button type="button" disabled={selectedIds.length === 0 || !bulkAssigneeId} onClick={async () => {
            await onBulkReassign(selectedIds, bulkAssigneeId || null);
            setSelectedIds([]);
            setBulkAssigneeId("");
          }}>Bulk Reassign ({selectedIds.length})</button>
        </div>
      ) : null}

      <div className="grid-cards" style={{ alignItems: "start" }}>
        {Object.entries(groups).map(([status, rows]) => (
          <div key={status} className="validation-card">
            <strong>{status.replace("_", " ")}</strong>
            <p className="muted" style={{ marginTop: 4 }}>{rows.length} item(s)</p>
            <div style={{ display: "grid", gap: 8 }}>
              {rows.map((item) => {
                const aging = agingLabel(item.createdAt);
                return (
                  <div key={item.id} className="validation-card">
                    {onBulkReassign ? <label><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={(e) => setSelectedIds((current) => e.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))} /> Select</label> : null}
                    <strong>{item.assignedTo?.fullName || item.assignedTo?.email || "Unassigned"}</strong>
                    <p style={{ margin: "6px 0" }}>{item.body}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                      <span className={priorityBadge(item.priority)}>{item.priority}</span>
                      <span className={aging.className}>Age {aging.label}</span>
                      {isOverdue(item) ? <span className="badge badge-error">Overdue</span> : null}
                    </div>
                    <p className="muted" style={{ margin: 0 }}>Target: {item.targetType}{item.targetId ? ` • ${item.targetId}` : ""}</p>
                    <p className="muted" style={{ margin: 0 }}>Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : "No due date"}</p>
                  </div>
                );
              })}
              {rows.length === 0 ? <p className="muted">No items.</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
