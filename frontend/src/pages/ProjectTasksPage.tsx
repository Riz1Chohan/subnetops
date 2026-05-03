import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { TaskBoard } from "../features/comments/components/TaskBoard";
import { TeamWorkloadBoard } from "../features/comments/components/TeamWorkloadBoard";
import { useBulkReassignProjectTasks, useMentionSuggestions, useProjectComments, useQueueProjectOverdueReminders } from "../features/comments/hooks";
import { useCurrentUser } from "../features/auth/hooks";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { EmptyState } from "../components/app/EmptyState";
import { ErrorState } from "../components/app/ErrorState";
import type { ProjectComment } from "../lib/types";

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

export function ProjectTasksPage() {
  const { projectId = "" } = useParams();
  const authQuery = useCurrentUser();
  const commentsQuery = useProjectComments(projectId);
  const mentionSuggestionsQuery = useMentionSuggestions(projectId);
  const bulkReassignMutation = useBulkReassignProjectTasks(projectId);
  const queueRemindersMutation = useQueueProjectOverdueReminders(projectId);

  const bulkAssigneeOptions = useMemo(() => {
    const self = authQuery.data?.user
      ? [{ id: authQuery.data.user.id, email: authQuery.data.user.email, fullName: authQuery.data.user.fullName, mentionToken: `@${authQuery.data.user.email.split("@")[0]}` }]
      : [];
    const merged = [...self, ...(mentionSuggestionsQuery.data ?? [])];
    const seen = new Set<string>();
    return merged.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [authQuery.data?.user, mentionSuggestionsQuery.data]);

  const comments = commentsQuery.data ?? [];
  const taskItems = useMemo(() => flatten(comments).filter((item) => item.assignedTo || item.dueDate || item.targetId || item.taskStatus !== "OPEN"), [comments]);
  const summary = useMemo(() => ({
    total: taskItems.length,
    open: taskItems.filter((item) => item.taskStatus === "OPEN").length,
    overdue: taskItems.filter((item) => isOverdue(item)).length,
    assigned: taskItems.filter((item) => Boolean(item.assignedTo)).length,
  }), [taskItems]);

  if (commentsQuery.isLoading) {
    return <LoadingState title="Loading project tasks" message="Preparing task board, workload view, and assignee controls." />;
  }

  if (commentsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load project tasks"
        message={commentsQuery.error instanceof Error ? commentsQuery.error.message : "SubnetOps could not load project tasks right now."}
        action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
      />
    );
  }

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Tasks"
        description="A focused workspace for project review items, assignments, and overdue follow-up."
      />

      <div className="summary-grid">
        <div className="summary-card"><div className="muted">Tracked tasks</div><div className="value">{summary.total}</div></div>
        <div className="summary-card"><div className="muted">Open</div><div className="value">{summary.open}</div></div>
        <div className="summary-card"><div className="muted">Overdue</div><div className="value">{summary.overdue}</div></div>
        <div className="summary-card"><div className="muted">Assigned</div><div className="value">{summary.assigned}</div></div>
      </div>

      {comments.length === 0 ? (
        <EmptyState
          title="No project tasks yet"
          message="Validation findings, comments, and review assignments will appear here once the project starts collecting task-based work."
        />
      ) : (
        <>
          <TaskBoard
            comments={comments}
            currentUserId={authQuery.data?.user.id}
            mentionOptions={bulkAssigneeOptions}
            onBulkReassign={async (ids, assignedToUserId) => {
              const result = await bulkReassignMutation.mutateAsync({ commentIds: ids, assignedToUserId });
              window.alert(`Reassigned ${result.updated} task(s).`);
            }}
            onQueueReminders={async () => {
              const result = await queueRemindersMutation.mutateAsync();
              window.alert(`Queued ${result.queued} overdue reminder(s).`);
            }}
          />

          <TeamWorkloadBoard comments={comments} />
        </>
      )}
    </section>
  );
}
