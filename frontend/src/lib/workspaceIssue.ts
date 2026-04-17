export interface WorkspaceIssueNotice {
  issueId: string;
  title: string;
  detail: string;
  focus?: string;
}

const issueTitleMap: Record<string, string> = {
  "route-inference": "Route authority is still partly inferred",
  "boundary-inference": "Boundary authority is still partly inferred",
  "unresolved-refs": "Cross-model references are still unresolved",
  "site-authority": "Some sites are still authority-thin",
  "flow-coverage": "Required traffic-path coverage is incomplete",
  traceability: "Traceability is still too thin",
  lld: "Per-site low-level design is still too thin",
};

export function parseWorkspaceIssueNotice(search: string): WorkspaceIssueNotice | null {
  const params = new URLSearchParams(search);
  const issueId = params.get("issue")?.trim();
  if (!issueId) return null;
  const title = params.get("issueTitle")?.trim() || issueTitleMap[issueId] || "Open issue";
  const detail = params.get("issueDetail")?.trim() || "This item was opened from the Action Center so you can review and correct the exact section that still needs attention.";
  const focus = params.get("focus")?.trim() || undefined;
  return { issueId, title, detail, focus };
}

export function buildWorkspaceIssuePath(path: string, issue: { key: string; title: string; detail: string }) {
  const url = new URL(path, "http://subnetops.local");
  if (!url.searchParams.has("issue")) url.searchParams.set("issue", issue.key);
  if (!url.searchParams.has("issueTitle")) url.searchParams.set("issueTitle", issue.title);
  if (!url.searchParams.has("issueDetail")) url.searchParams.set("issueDetail", issue.detail);
  return `${url.pathname}${url.search}${url.hash}`;
}
