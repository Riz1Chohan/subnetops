import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { ValidationList } from "../features/validation/components/ValidationList";
import { useRunValidation, useValidationResults } from "../features/validation/hooks";
import { useCreateProjectComment, useProjectComments } from "../features/comments/hooks";
import { useExplainValidationFinding } from "../features/ai/hooks";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import { useAuthoritativeDesign } from "../features/designCore/hooks";
import type { ValidationResult } from "../lib/types";
import { AIValidationInsight } from "../features/ai/components/AIValidationInsight";
import { buildValidationFixPath, validationFixLabel } from "../lib/validationFixLink";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";
import { EmptyState } from "../components/app/EmptyState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { buildValidationReadinessSummary } from "../lib/designReadiness";
import { WorkspaceIssueBanner } from "../components/app/WorkspaceIssueBanner";
import { parseWorkspaceIssueNotice } from "../lib/workspaceIssue";
import { DesignAuthorityBanner } from "../lib/designAuthority";

function categoryForRule(ruleCode: string) {
  if (ruleCode.includes("OVERLAP") || ruleCode.includes("SITE_BLOCK") || ruleCode.includes("NONCANONICAL")) return "Addressing";
  if (ruleCode.includes("GATEWAY")) return "Gateway";
  if (ruleCode.includes("HOST_CAPACITY") || ruleCode.includes("RIGHTSIZE")) return "Capacity";
  if (ruleCode.includes("SLASH31") || ruleCode.includes("SLASH32")) return "Segment Role";
  if (ruleCode.includes("INVALID")) return "Input Quality";
  return "General";
}

function healthLabel(errorCount: number, warningCount: number) {
  if (errorCount === 0 && warningCount === 0) return "Clean";
  if (errorCount === 0) return `Warnings only (${warningCount})`;
  return `${errorCount} error${errorCount === 1 ? "" : "s"}`;
}

const severityOrder = { ERROR: 0, WARNING: 1, INFO: 2 } as const;

export function ProjectValidationPage() {
  const { projectId = "" } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const validationQuery = useValidationResults(projectId);
  const projectQuery = useProject(projectId);
  const sitesQuery = useProjectSites(projectId);
  const vlansQuery = useProjectVlans(projectId);
  const validationMutation = useRunValidation(projectId);
  const commentsQuery = useProjectComments(projectId);
  const createCommentMutation = useCreateProjectComment(projectId);
  const explainMutation = useExplainValidationFinding();
  const [selectedItem, setSelectedItem] = useState<ValidationResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "ERROR" | "WARNING" | "INFO">("all");
  const [entityFilter, setEntityFilter] = useState<"all" | "PROJECT" | "SITE" | "VLAN">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const insightRef = useRef<HTMLDivElement | null>(null);
  const refreshedFromFix = searchParams.get("refreshed") === "1";

  useEffect(() => {
    if (!projectId || !refreshedFromFix) return;
    validationMutation.mutate(undefined, {
      onSettled: () => {
        const next = new URLSearchParams(searchParams);
        next.delete("refreshed");
        setSearchParams(next, { replace: true });
      },
    });
  }, [projectId, refreshedFromFix, searchParams, setSearchParams, validationMutation]);

  const items = validationQuery.data ?? [];
  const selectedSection = new URLSearchParams(location.search).get("section") ?? "health";
  const isFocusedSectionView = Boolean(selectedSection);
  const issueNotice = parseWorkspaceIssueNotice(location.search);
  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const requirementsProfile = useMemo(() => parseRequirementsProfile(project?.requirementsJson), [project?.requirementsJson]);
  const { synthesized: synthesizedDesign, designCore, authority } = useAuthoritativeDesign(projectId, project, sites, vlans, requirementsProfile);
  const errorCount = items.filter((item) => item.severity === "ERROR").length;
  const warningCount = items.filter((item) => item.severity === "WARNING").length;
  const infoCount = items.filter((item) => item.severity === "INFO").length;
  const categories = Array.from(new Set(items.map((item) => categoryForRule(item.ruleCode)))).sort();
  const readinessSummary = useMemo(
    () => buildValidationReadinessSummary(project, sites, vlans, requirementsProfile, synthesizedDesign, errorCount, warningCount),
    [project, sites, vlans, requirementsProfile, synthesizedDesign, errorCount, warningCount],
  );

  const filteredItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;
        const matchesEntity = entityFilter === "all" || item.entityType === entityFilter;
        const category = categoryForRule(item.ruleCode);
        const matchesCategory = categoryFilter === "all" || category === categoryFilter;
        const haystack = `${item.title} ${item.message} ${item.issue ?? ""} ${item.impact ?? ""} ${item.recommendation ?? ""} ${item.ruleCode} ${item.entityType} ${category}`.toLowerCase();
        const matchesSearch = haystack.includes(searchText.toLowerCase());
        return matchesSeverity && matchesEntity && matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        const severityDelta = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDelta !== 0) return severityDelta;
        return a.title.localeCompare(b.title);
      });
  }, [items, severityFilter, entityFilter, categoryFilter, searchText]);

  const groupedItems = useMemo(() => {
    const map = new Map<string, ValidationResult[]>();
    for (const item of filteredItems) {
      const category = categoryForRule(item.ruleCode);
      map.set(category, [...(map.get(category) ?? []), item]);
    }
    return Array.from(map.entries());
  }, [filteredItems]);

  const openTaskBodies = new Set<string>((commentsQuery.data ?? []).map((comment) => comment.body));
  const backendSummary = designCore?.networkObjectModel?.summary;

  if (projectQuery.isLoading || validationQuery.isLoading) {
    return <LoadingState title="Loading validation" message="Loading backend validation results and design-core authority state." />;
  }

  if (projectQuery.isError || validationQuery.isError) {
    return (
      <ErrorState
        title="Unable to load validation"
        message={
          projectQuery.error instanceof Error
            ? projectQuery.error.message
            : validationQuery.error instanceof Error
              ? validationQuery.error.message
              : "SubnetOps could not load validation right now."
        }
      />
    );
  }

  if (!project) {
    return (
      <EmptyState
        title="Project not found"
        message="The requested project could not be loaded."
        action={<Link to="/dashboard" className="link-button">Back to Dashboard</Link>}
      />
    );
  }

  const focusedSectionTitle = selectedSection === "findings"
    ? "Findings"
    : selectedSection === "guidance"
      ? "Review guidance"
      : "Health summary";

  const convertToTask = (item: ValidationResult) => {
    createCommentMutation.mutate({
      body: `[Validation] ${item.title} — ${item.issue || item.message}`,
      taskStatus: "OPEN",
      priority: item.severity === "ERROR" ? "HIGH" : item.severity === "WARNING" ? "MEDIUM" : "LOW",
      targetType: item.entityType,
      targetId: item.entityId,
    });
  };

  const explainFinding = (item: ValidationResult) => {
    setSelectedItem(item);
    explainMutation.mutate({
      title: item.title,
      message: item.message,
      severity: item.severity,
      entityType: item.entityType,
    });
    requestAnimationFrame(() => insightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <section style={{ display: "grid", gap: 18 }}>
      {isFocusedSectionView ? (
        <div className="panel workspace-detail-toolbar">
          <div>
            <p className="workspace-detail-kicker">Validation</p>
            <strong>{focusedSectionTitle}</strong>
          </div>
          <div className="workspace-detail-actions">
            <button type="button" className="button-secondary" onClick={() => validationMutation.mutate()} disabled={validationMutation.isPending}>
              {validationMutation.isPending ? "Running..." : "Run Validation"}
            </button>
          </div>
        </div>
      ) : (
        <SectionHeader
          title="Validation"
          description="Review backend validation findings, authority state, and the design-core signals that affect release readiness."
          actions={
            <button type="button" onClick={() => validationMutation.mutate()} disabled={validationMutation.isPending}>
              {validationMutation.isPending ? "Running..." : "Run Validation"}
            </button>
          }
        />
      )}

      <WorkspaceIssueBanner notice={issueNotice} />
      <DesignAuthorityBanner authority={authority} compact />

      {refreshedFromFix ? (
        <div className="panel" style={{ borderColor: "rgba(40,167,69,0.28)", background: "rgba(40,167,69,0.08)" }}>
          <strong style={{ display: "block", marginBottom: 6 }}>Validation refresh in progress</strong>
          <p className="muted" style={{ margin: 0 }}>SubnetOps is re-running validation after your latest fix so resolved findings can drop out of the review list.</p>
        </div>
      ) : null}

      <div data-validation-section="health" className="panel validation-trust-panel" style={{ display: selectedSection !== "health" ? "none" : "grid" }}>
        <div className="validation-trust-header">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Backend validation health</p>
            <h2 style={{ margin: "4px 0 8px 0" }}>{healthLabel(errorCount, warningCount)}</h2>
            <p className="muted" style={{ margin: 0 }}>{readinessSummary.summary}</p>
          </div>
          <div className={`validation-confidence-pill ${readinessSummary.status}`}>
            <strong>{readinessSummary.score}%</strong>
            <span>design trust</span>
          </div>
        </div>

        <div className="validation-trust-meter" aria-hidden="true">
          <span className={readinessSummary.status} style={{ width: `${readinessSummary.score}%` }} />
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
          <div className="panel validation-subpanel">
            <h3 style={{ marginTop: 0 }}>Finding counts</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge badge-error">errors {errorCount}</span>
              <span className="badge badge-warning">warnings {warningCount}</span>
              <span className="badge badge-info">info {infoCount}</span>
            </div>
          </div>
          <div className="panel validation-subpanel">
            <h3 style={{ marginTop: 0 }}>Design-core signals</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="badge-soft">graph findings {backendSummary?.designGraphIntegrityFindingCount ?? 0}</span>
              <span className="badge-soft">routing findings {backendSummary?.reachabilityFindingCount ?? 0}</span>
              <span className="badge-soft">security findings {backendSummary?.securityPolicyFindingCount ?? 0}</span>
              <span className="badge-soft">implementation blockers {backendSummary?.implementationPlanBlockingFindingCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div data-validation-section="findings" className="panel" style={{ display: selectedSection !== "findings" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Validation findings</h2>
          <p className="muted" style={{ margin: 0 }}>Filter backend validation results. The frontend is not recalculating subnet, routing, or security truth here.</p>
        </div>

        <div className="form-grid">
          <label>
            Severity
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}>
              <option value="all">All severities</option>
              <option value="ERROR">Errors</option>
              <option value="WARNING">Warnings</option>
              <option value="INFO">Info</option>
            </select>
          </label>
          <label>
            Entity
            <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value as typeof entityFilter)}>
              <option value="all">All entities</option>
              <option value="PROJECT">Project</option>
              <option value="SITE">Site</option>
              <option value="VLAN">VLAN</option>
            </select>
          </label>
          <label>
            Category
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            Search
            <input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search finding text" />
          </label>
        </div>

        {groupedItems.map(([category, categoryItems]) => (
          <div key={category} className="panel" style={{ background: "rgba(255,255,255,0.02)" }}>
            <h3 style={{ marginTop: 0 }}>{category}</h3>
            <ValidationList
              items={categoryItems}
              onConvertToTask={convertToTask}
              onExplain={explainFinding}
              openTaskBodies={openTaskBodies}
              getFixPath={(item) => buildValidationFixPath(projectId, item)}
              getFixLabel={validationFixLabel}
            />
          </div>
        ))}

        {groupedItems.length === 0 ? (
          <EmptyState title="No matching findings" message="No validation findings match the current filters." />
        ) : null}
      </div>

      <div data-validation-section="guidance" className="panel" style={{ display: selectedSection !== "guidance" ? "none" : "grid", gap: 14 }}>
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Review guidance</h2>
          <p className="muted" style={{ margin: 0 }}>
            Use this only as review support. Backend validation and design-core outputs remain the source of truth.
          </p>
        </div>
        <div className="trust-note">
          <strong>Release rule</strong>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Do not ship a project while ERROR findings, backend authority gaps, or implementation blockers remain unresolved.
          </p>
        </div>
        <div ref={insightRef}>
          {selectedItem && explainMutation.data ? (
            <AIValidationInsight item={selectedItem} explanation={explainMutation.data} />
          ) : (
            <EmptyState title="No AI explanation selected" message="Open the findings section and choose Suggest fix on a validation card." />
          )}
        </div>
      </div>
    </section>
  );
}
