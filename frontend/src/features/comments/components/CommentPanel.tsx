import { useEffect, useMemo, useState } from "react";
import { useCreateProjectComment, useMentionSuggestions, useProjectComments, useTogglePinComment, useToggleResolveComment, useUpdateCommentTask } from "../hooks";
import type { ProjectComment, Site, Vlan, CommentTaskPriority } from "../../../lib/types";

function renderMentions(text: string) {
  const parts = text.split(/(@[\w.-]+)/g);
  return parts.map((part, index) =>
    part.startsWith("@") ? <strong key={index} style={{ color: "#2357d8" }}>{part}</strong> : <span key={index}>{part}</span>,
  );
}

function statusBadge(status: string) {
  if (status === "DONE") return "badge badge-info";
  if (status === "BLOCKED") return "badge badge-error";
  if (status === "IN_PROGRESS") return "badge badge-warning";
  return "badge badge-warning";
}

function priorityBadge(priority: CommentTaskPriority) {
  if (priority === "CRITICAL") return "badge badge-error";
  if (priority === "HIGH") return "badge badge-warning";
  if (priority === "MEDIUM") return "badge badge-info";
  return "badge badge-info";
}

function agingLabel(createdAt: string) {
  const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
  if (days >= 7) return { label: `Aging ${days}d`, className: "badge badge-error" };
  if (days >= 3) return { label: `Aging ${days}d`, className: "badge badge-warning" };
  return { label: `New ${days}d`, className: "badge badge-info" };
}

function CommentItem({ comment, onReply, onResolve, onPin, onStatus, onPriority, currentUserId, canEditProject }: { comment: ProjectComment; onReply: (comment: ProjectComment) => void; onResolve: (commentId: string) => void; onPin: (commentId: string) => void; onStatus: (commentId: string, nextStatus: "OPEN" | "IN_PROGRESS" | "BLOCKED" | "DONE") => void; onPriority: (commentId: string, nextPriority: CommentTaskPriority) => void; currentUserId?: string; canEditProject?: boolean; }) {
  const aging = agingLabel(comment.createdAt);
  const canManage = Boolean(canEditProject || comment.userId === currentUserId || comment.assignedTo?.id === currentUserId);
  const canPin = Boolean(canEditProject || comment.userId === currentUserId);
  const canSetPriority = Boolean(canEditProject || comment.userId === currentUserId);
  return (
    <div className="validation-card">
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <strong>{comment.user.fullName || comment.user.email}</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {comment.isPinned ? <span className="badge badge-info">Pinned</span> : null}
          {comment.visibility === "REVIEWER_ONLY" ? <span className="badge badge-warning">Reviewer Note</span> : null}
          {comment.isResolved ? <span className="badge badge-info">Resolved</span> : null}
          <span className={priorityBadge(comment.priority)}>{comment.priority}</span>
          <span className={aging.className}>{aging.label}</span>
          <span className={statusBadge(comment.taskStatus)}>{comment.taskStatus.replace("_", " ")}</span>
        </div>
      </div>
      <p style={{ margin: "6px 0" }}>{renderMentions(comment.body)}</p>
      <p className="muted" style={{ margin: "6px 0" }}>Assigned to: {comment.assignedTo?.fullName || comment.assignedTo?.email || "Unassigned"} • Due: {comment.dueDate ? new Date(comment.dueDate).toLocaleDateString() : "No due date"} • Target: {comment.targetType}{comment.targetId ? ` (${comment.targetId})` : ""}</p>
      <div className="form-actions">
        <button type="button" onClick={() => onReply(comment)}>Reply</button>
        {canManage ? <button type="button" onClick={() => onResolve(comment.id)}>{comment.isResolved ? "Reopen" : "Resolve"}</button> : null}
        {canPin ? <button type="button" onClick={() => onPin(comment.id)}>{comment.isPinned ? "Unpin" : "Pin"}</button> : null}
        {canSetPriority ? <select value={comment.priority} onChange={(e) => onPriority(comment.id, e.target.value as CommentTaskPriority)}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </select> : null}
        {canManage ? <select value={comment.taskStatus} onChange={(e) => onStatus(comment.id, e.target.value as any)}>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="BLOCKED">Blocked</option>
          <option value="DONE">Done</option>
        </select> : null}
      </div>
      <p className="muted" style={{ margin: 0 }}>{new Date(comment.createdAt).toLocaleString()}</p>

      {comment.replies && comment.replies.length > 0 ? (
        <div style={{ display: "grid", gap: 8, marginTop: 10, paddingLeft: 18, borderLeft: "2px solid #dde3f0" }}>
          {comment.replies.map((reply) => {
            const replyAging = agingLabel(reply.createdAt);
            return (
              <div key={reply.id} className="validation-card">
                <strong>{reply.user.fullName || reply.user.email}</strong>
                <p style={{ margin: "6px 0" }}>{renderMentions(reply.body)}</p>
                <p className="muted" style={{ margin: "6px 0" }}>Assigned to: {reply.assignedTo?.fullName || reply.assignedTo?.email || "Unassigned"} • Due: {reply.dueDate ? new Date(reply.dueDate).toLocaleDateString() : "No due date"}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {reply.visibility === "REVIEWER_ONLY" ? <span className="badge badge-warning">Reviewer Note</span> : null}
                  {reply.isResolved ? <span className="badge badge-info">Resolved</span> : null}
                  <span className={priorityBadge(reply.priority)}>{reply.priority}</span>
                  <span className={replyAging.className}>{replyAging.label}</span>
                  <span className={statusBadge(reply.taskStatus)}>{reply.taskStatus.replace("_", " ")}</span>
                </div>
                <p className="muted" style={{ margin: 0 }}>{new Date(reply.createdAt).toLocaleString()}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function CommentPanel({ projectId, sites = [], vlans = [], preselectedTarget, currentUserId, canEditProject }: { projectId: string; sites?: Site[]; vlans?: Vlan[]; preselectedTarget?: { targetType: "SITE" | "VLAN"; targetId: string } | null; currentUserId?: string; canEditProject?: boolean; }) {
  const commentsQuery = useProjectComments(projectId);
  const suggestionsQuery = useMentionSuggestions(projectId);
  const createCommentMutation = useCreateProjectComment(projectId);
  const toggleResolveMutation = useToggleResolveComment(projectId);
  const togglePinMutation = useTogglePinComment(projectId);
  const updateTaskMutation = useUpdateCommentTask(projectId);
  const [body, setBody] = useState("");
  const [parentComment, setParentComment] = useState<ProjectComment | null>(null);
  const [reviewerOnly, setReviewerOnly] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<CommentTaskPriority>("MEDIUM");
  const [targetType, setTargetType] = useState<"PROJECT" | "SITE" | "VLAN">("PROJECT");
  const [targetId, setTargetId] = useState("");

  const currentMentionToken = useMemo(() => {
    const match = body.match(/@([\w.-]*)$/);
    return match?.[1]?.toLowerCase() || "";
  }, [body]);

  const matchingSuggestions = useMemo(() => {
    if (!currentMentionToken) return [];
    return (suggestionsQuery.data ?? []).filter((item) => {
      const label = `${item.mentionToken} ${item.email} ${item.fullName || ""}`.toLowerCase();
      return label.includes(currentMentionToken);
    }).slice(0, 5);
  }, [currentMentionToken, suggestionsQuery.data]);

  const mentionHint = useMemo(() => {
    const matches = body.match(/@[\w.-]+/g) || [];
    return matches.length > 0 ? `Mentions detected: ${matches.join(", ")}` : "Tip: type @name or @email in a comment.";
  }, [body]);

  const targetOptions = targetType === "SITE" ? sites.map((site) => ({ id: site.id, label: site.name })) : targetType === "VLAN" ? vlans.map((vlan) => ({ id: vlan.id, label: `${vlan.vlanId} ${vlan.vlanName}` })) : [];

  useEffect(() => {
    if (preselectedTarget) {
      setTargetType(preselectedTarget.targetType);
      setTargetId(preselectedTarget.targetId);
    }
  }, [preselectedTarget]);

  return (
    <div className="panel" style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>Comments</h2>
      {preselectedTarget ? <p className="muted" style={{ margin: 0 }}>Diagram target selected: {preselectedTarget.targetType} • {preselectedTarget.targetId}</p> : null}
      {parentComment ? <p className="muted" style={{ margin: 0 }}>Replying to: <strong>{parentComment.user.fullName || parentComment.user.email}</strong></p> : null}
      <textarea rows={4} placeholder="Add a project comment or review note" value={body} onChange={(e) => setBody(e.target.value)} />
      <p className="muted" style={{ margin: 0 }}>{mentionHint}</p>
      {matchingSuggestions.length > 0 ? (
        <div className="legend">
          {matchingSuggestions.map((item) => (
            <button key={item.id} type="button" onClick={() => setBody((current) => current.replace(/@[\w.-]*$/, `${item.mentionToken} `))}>{item.fullName || item.email}</button>
          ))}
        </div>
      ) : null}
      <div style={{ display: "grid", gap: 10 }} className="grid-2">
        <label><input type="checkbox" checked={reviewerOnly} onChange={(e) => setReviewerOnly(e.target.checked)} /> Reviewer-only note</label>
        <label><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin comment</label>
        <select value={assignedToUserId} onChange={(e) => setAssignedToUserId(e.target.value)}>
          <option value="">Unassigned</option>
          {(suggestionsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.fullName || item.email}</option>)}
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <select value={priority} onChange={(e) => setPriority(e.target.value as CommentTaskPriority)}>
          <option value="LOW">Low priority</option>
          <option value="MEDIUM">Medium priority</option>
          <option value="HIGH">High priority</option>
          <option value="CRITICAL">Critical priority</option>
        </select>
        <select value={targetType} onChange={(e) => { setTargetType(e.target.value as any); setTargetId(""); }}>
          <option value="PROJECT">Project</option>
          <option value="SITE">Site</option>
          <option value="VLAN">VLAN</option>
        </select>
        {targetType !== "PROJECT" ? (
          <select value={targetId} onChange={(e) => setTargetId(e.target.value)}>
            <option value="">Select target</option>
            {targetOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        ) : <div />}
      </div>
      <div className="form-actions">
        <button type="button" disabled={createCommentMutation.isPending || !body.trim()} onClick={async () => {
          await createCommentMutation.mutateAsync({ body, parentId: parentComment?.id, visibility: reviewerOnly ? "REVIEWER_ONLY" : "ALL", isPinned: pinned, assignedToUserId: assignedToUserId || undefined, dueDate: dueDate || undefined, taskStatus: "OPEN", priority, targetType, targetId: targetId || undefined });
          setBody("");
          setParentComment(null);
          setReviewerOnly(false);
          setPinned(false);
          setAssignedToUserId("");
          setDueDate("");
          setPriority("MEDIUM");
          setTargetType("PROJECT");
          setTargetId("");
        }}>
          {createCommentMutation.isPending ? "Posting..." : parentComment ? "Post Reply" : "Post Comment"}
        </button>
        {parentComment ? <button type="button" onClick={() => setParentComment(null)}>Cancel Reply</button> : null}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {(commentsQuery.data ?? []).map((comment) => (
          <CommentItem key={comment.id} comment={comment} onReply={(item) => setParentComment(item)} onResolve={(commentId) => void toggleResolveMutation.mutateAsync(commentId)} onPin={(commentId) => void togglePinMutation.mutateAsync(commentId)} onStatus={(commentId, nextStatus) => void updateTaskMutation.mutateAsync({ commentId, values: { taskStatus: nextStatus } })} onPriority={(commentId, nextPriority) => void updateTaskMutation.mutateAsync({ commentId, values: { priority: nextPriority } })} currentUserId={currentUserId} canEditProject={canEditProject} />
        ))}
        {!commentsQuery.isLoading && (commentsQuery.data ?? []).length === 0 ? <p className="muted">No comments yet.</p> : null}
      </div>
    </div>
  );
}
