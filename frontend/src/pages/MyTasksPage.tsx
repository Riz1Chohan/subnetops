import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAssignedTasks, useQueueMyDigest, useUpdateCommentTask } from "../features/comments/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import type { CommentTaskPriority } from "../lib/types";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";

function isOverdue(dueDate?: string, taskStatus?: string) {
  if (!dueDate || taskStatus === "DONE") return false;
  return new Date(dueDate).getTime() < Date.now();
}

function priorityRank(priority: CommentTaskPriority) {
  if (priority === "CRITICAL") return 4;
  if (priority === "HIGH") return 3;
  if (priority === "MEDIUM") return 2;
  return 1;
}

function priorityBadge(priority: CommentTaskPriority) {
  if (priority === "CRITICAL") return "badge badge-error";
  if (priority === "HIGH") return "badge badge-warning";
  return "badge badge-info";
}

function agingLabel(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days >= 7) return { label: `SLA ${days}d`, className: "badge badge-error" };
  if (days >= 3) return { label: `SLA ${days}d`, className: "badge badge-warning" };
  return { label: `SLA ${days}d`, className: "badge badge-info" };
}

export function MyTasksPage() {
  const tasksQuery = useAssignedTasks();
  const authQuery = useCurrentUser();
  const updateTaskMutation = useUpdateCommentTask("");
  const queueDigestMutation = useQueueMyDigest();
  const tasks = tasksQuery.data ?? [];
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<"all" | CommentTaskPriority>("all");
  const [sortMode, setSortMode] = useState<"priority" | "due">("priority");
  const overdue = tasks.filter((item) => isOverdue(item.dueDate, item.taskStatus)).length;
  const open = tasks.filter((item) => item.taskStatus !== "DONE").length;
  const dueToday = tasks.filter((item) => item.dueDate && new Date(item.dueDate).toDateString() === new Date().toDateString()).length;

  const filteredTasks = useMemo(() => {
    const rows = tasks.filter((item) => priorityFilter === "all" || item.priority === priorityFilter);
    rows.sort((a, b) => {
      if (sortMode === "priority") {
        const delta = priorityRank(b.priority) - priorityRank(a.priority);
        if (delta !== 0) return delta;
      }
      const dueA = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const dueB = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return dueA - dueB;
    });
    return rows;
  }, [tasks, priorityFilter, sortMode]);

  const byProject = Object.values(tasks.reduce((acc, item) => {
    const key = item.project?.id || item.projectId;
    const current = acc[key] || { name: item.project?.name || "Project", open: 0, overdue: 0, total: 0, critical: 0 };
    current.total += 1;
    if (item.taskStatus !== "DONE") current.open += 1;
    if (isOverdue(item.dueDate, item.taskStatus)) current.overdue += 1;
    if (item.priority === "CRITICAL") current.critical += 1;
    acc[key] = current;
    return acc;
  }, {} as Record<string, { name: string; open: number; overdue: number; total: number; critical: number }>));

  if (tasksQuery.isLoading) {
    return <LoadingState title="Loading my tasks" message="Gathering your assigned work, due dates, and project summaries." />;
  }

  if (tasksQuery.isError) {
    return (
      <ErrorState
        title="Unable to load your tasks"
        message={tasksQuery.error instanceof Error ? tasksQuery.error.message : "SubnetOps could not load your assigned tasks right now."}
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="My Tasks"
        description={`Assigned review items for ${authQuery.data?.user.email || "your account"}.`}
        actions={
          <>
            <button
              type="button"
              onClick={async () => {
                const result = await queueDigestMutation.mutateAsync();
                window.alert(result.queued ? `Digest queued. Open: ${result.open ?? 0}, Overdue: ${result.overdue ?? 0}.` : result.reason || "Digest not queued.");
              }}
              disabled={queueDigestMutation.isPending}
            >
              {queueDigestMutation.isPending ? "Queueing..." : "Queue My Digest"}
            </button>
            <Link to="/dashboard" className="link-button">Back to Dashboard</Link>
          </>
        }
      />

      <div className="summary-grid">
        <div className="summary-card"><div className="muted">Open</div><div className="value">{open}</div></div>
        <div className="summary-card"><div className="muted">Overdue</div><div className="value">{overdue}</div></div>
        <div className="summary-card"><div className="muted">Due Today</div><div className="value">{dueToday}</div></div>
      </div>

      <div className="panel">
        <h2 style={{ marginTop: 0 }}>Tasks by Project</h2>
        {byProject.length === 0 ? (
          <EmptyState
            title="No assigned tasks yet"
            message="When tasks are assigned to you, this page will group them by project and show what needs attention first."
          />
        ) : (
          <div className="grid-cards">
            {byProject.map((project) => (
              <div key={project.name} className="validation-card">
                <strong>{project.name}</strong>
                <p className="muted" style={{ margin: "6px 0" }}>Open: {project.open} • Total: {project.total}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span className={project.overdue > 0 ? "badge badge-error" : "badge badge-info"}>Overdue: {project.overdue}</span>
                  <span className={project.critical > 0 ? "badge badge-error" : "badge badge-info"}>Critical: {project.critical}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ marginTop: 0 }}>Assigned Items</h2>
          <div className="form-actions">
            <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as "all" | CommentTaskPriority)}>
              <option value="all">All priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as "priority" | "due")}>
              <option value="priority">Sort by priority</option>
              <option value="due">Sort by due date</option>
            </select>
            <button
              type="button"
              disabled={selectedTaskIds.length === 0}
              onClick={async () => {
                for (const taskId of selectedTaskIds) {
                  await updateTaskMutation.mutateAsync({ commentId: taskId, values: { taskStatus: "DONE" } });
                }
                setSelectedTaskIds([]);
              }}
            >
              Mark Selected Done
            </button>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {filteredTasks.map((task) => {
            const aging = agingLabel(task.createdAt);
            return (
              <div key={task.id} className="validation-card">
                <label><input type="checkbox" checked={selectedTaskIds.includes(task.id)} onChange={(e) => setSelectedTaskIds((current) => e.target.checked ? [...current, task.id] : current.filter((id) => id !== task.id))} /> Select</label>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{task.project?.name || "Project task"}</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className={priorityBadge(task.priority)}>{task.priority}</span>
                    <span className={aging.className}>{aging.label}</span>
                    <span className={task.taskStatus === "DONE" ? "badge badge-info" : isOverdue(task.dueDate, task.taskStatus) ? "badge badge-error" : "badge badge-warning"}>
                      {task.taskStatus.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <p style={{ margin: "6px 0" }}>{task.body}</p>
                <p className="muted" style={{ margin: 0 }}>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No due date"} • Target: {task.targetType}</p>
                <div className="form-actions">
                  <Link to={`/projects/${task.projectId}`} className="link-button">Open Project</Link>
                  <select value={task.priority} onChange={(e) => void updateTaskMutation.mutateAsync({ commentId: task.id, values: { priority: e.target.value as CommentTaskPriority } })}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  <select value={task.taskStatus} onChange={(e) => void updateTaskMutation.mutateAsync({ commentId: task.id, values: { taskStatus: e.target.value as "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE" } })}>
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="BLOCKED">Blocked</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 ? (
            <EmptyState
              title={tasks.length === 0 ? "No assigned tasks yet" : "No tasks match this filter"}
              message={tasks.length === 0 ? "Assigned review work will appear here when someone adds you to a task." : "Try a different priority filter or sort view to bring matching tasks back into view."}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}
