import type { WorkspaceIssueNotice } from "../../lib/workspaceIssue";

export function WorkspaceIssueBanner({ notice }: { notice: WorkspaceIssueNotice | null }) {
  if (!notice) return null;
  return (
    <div className="panel workspace-issue-banner">
      <p className="workspace-issue-kicker">Opened from Action Center</p>
      <strong style={{ display: "block", marginBottom: 8 }}>{notice.title}</strong>
      <p className="muted" style={{ margin: 0 }}>{notice.detail}</p>
    </div>
  );
}
