import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ValidationList } from "../features/validation/components/ValidationList";
import { useRunValidation, useValidationResults } from "../features/validation/hooks";
import { useCreateProjectComment, useProjectComments } from "../features/comments/hooks";
import { useExplainValidationFinding } from "../features/ai/hooks";
import { useProject, useProjectSites, useProjectVlans } from "../features/projects/hooks";
import type { ValidationResult } from "../lib/types";
import { AIValidationInsight } from "../features/ai/components/AIValidationInsight";
import { buildValidationFixPath, validationFixLabel } from "../lib/validationFixLink";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";
import { parseRequirementsProfile } from "../lib/requirementsProfile";
import { synthesizeLogicalDesign } from "../lib/designSynthesis";
import { buildValidationReadinessSummary } from "../lib/designReadiness";
import { buildRecoveryFocusPlan } from "../lib/recoveryFocus";
import { buildDesignAuthorityLedger } from "../lib/designAuthorityLedger";

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
  const project = projectQuery.data;
  const sites = sitesQuery.data ?? [];
  const vlans = vlansQuery.data ?? [];
  const requirementsProfile = useMemo(() => parseRequirementsProfile(project?.requirementsJson), [project?.requirementsJson]);
  const synthesizedDesign = useMemo(() => synthesizeLogicalDesign(project, sites, vlans, requirementsProfile), [project, sites, vlans, requirementsProfile]);
  const errorCount = items.filter((item) => item.severity === "ERROR").length;
  const warningCount = items.filter((item) => item.severity === "WARNING").length;
  const infoCount = items.filter((item) => item.severity === "INFO").length;
  const categories = Array.from(new Set(items.map((item) => categoryForRule(item.ruleCode)))).sort();
  const readinessSummary = useMemo(() => buildValidationReadinessSummary(project, sites, vlans, requirementsProfile, synthesizedDesign, errorCount, warningCount), [project, sites, vlans, requirementsProfile, synthesizedDesign, errorCount, warningCount]);
  const focusPlan = useMemo(() => buildRecoveryFocusPlan(projectId, synthesizedDesign, errorCount), [projectId, synthesizedDesign, errorCount]);
  const authorityLedger = useMemo(() => buildDesignAuthorityLedger(projectId, synthesizedDesign), [projectId, synthesizedDesign]);

  const filteredItems = useMemo(() => {
    return [...items]
      .filter((item) => {
        const matchesSeverity = severityFilter === "all" || item.severity === severityFilter;
        const matchesEntity = entityFilter === "all" || item.entityType === entityFilter;
        const category = categoryForRule(item.ruleCode);
        const matchesCategory = categoryFilter === "all" || category === categoryFilter;
        const haystack = `${item.title} ${item.message} ${item.ruleCode} ${item.entityType} ${category}`.toLowerCase();
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

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Validation"
        description="Review subnetting, gateway, capacity, and design issues in a more realistic engineering review workspace."
        actions={
          <button type="button" onClick={() => validationMutation.mutate()} disabled={validationMutation.isPending}>
            {validationMutation.isPending ? "Running..." : "Run Validation"}
          </button>
        }
      />

      <div className="panel recovery-focus-panel">
        <div>
          <h2 style={{ marginTop: 0, marginBottom: 8 }}>Validation focus for this recovery cycle</h2>
          <p className="muted" style={{ margin: 0 }}>{focusPlan.summary}</p>
        </div>
        <div className="recovery-focus-grid">
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>{focusPlan.headline}</strong>
            <div className="form-actions">
              <Link to={focusPlan.primaryAction.path} className="link-button">{focusPlan.primaryAction.label}</Link>
              {focusPlan.supportActions.slice(0, 2).map((action) => (
                <Link key={action.key} to={action.path} className="link-button link-button-subtle">{action.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <strong style={{ display: "block", marginBottom: 8 }}>Signals still dragging trust down</strong>
            <ul className="recovery-focus-signal-list" style={{ margin: 0 }}>
              {focusPlan.focusSignals.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {refreshedFromFix ? (
        <div className="panel" style={{ borderColor: "rgba(40,167,69,0.28)", background: "rgba(40,167,69,0.08)" }}>
          <strong style={{ display: "block", marginBottom: 6 }}>Validation refresh in progress</strong>
          <p className="muted" style={{ margin: 0 }}>SubnetOps is re-running validation after your latest fix so resolved findings can drop out of the review list.</p>
        </div>
      ) : null}


      <div className="panel validation-trust-panel">
        <div className="validation-trust-header">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>v110 trust and readiness</p>
            <h2 style={{ margin: "4px 0 8px 0" }}>{readinessSummary.label}</h2>
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

        <div className="validation-trust-grid">
          <div className="panel validation-subpanel">
            <div className="validation-subpanel-header">
              <h3 style={{ margin: 0 }}>Missing or weak inputs</h3>
              <span className="badge-soft">{readinessSummary.missingInfo.length}</span>
            </div>
            {readinessSummary.missingInfo.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No major missing-input signals were detected in this review pass.</p>
            ) : (
              <div className="validation-signal-list">
                {readinessSummary.missingInfo.map((item) => (
                  <div key={item.id} className={`validation-signal-card ${item.level}`}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong>{item.title}</strong>
                      <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                    </div>
                    <Link to={item.fixPath} className="link-button-subtle">{item.actionLabel}</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel validation-subpanel">
            <div className="validation-subpanel-header">
              <h3 style={{ margin: 0 }}>Contradictions and trust drops</h3>
              <span className="badge-soft">{readinessSummary.contradictions.length}</span>
            </div>
            {readinessSummary.contradictions.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No major requirement contradictions were detected in this pass.</p>
            ) : (
              <div className="validation-signal-list">
                {readinessSummary.contradictions.map((item) => (
                  <div key={item.id} className={`validation-signal-card ${item.level}`}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong>{item.title}</strong>
                      <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                    </div>
                    <Link to={item.fixPath} className="link-button-subtle">{item.actionLabel}</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid-2" style={{ alignItems: "start", marginTop: 14 }}>
          <div className="panel validation-subpanel">
            <div className="validation-subpanel-header">
              <h3 style={{ margin: 0 }}>Authority debt affecting validation</h3>
              <span className="badge-soft">{authorityLedger.debtItems.length}</span>
            </div>
            {authorityLedger.debtItems.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No major authority debt is currently being surfaced into validation review.</p>
            ) : (
              <div className="validation-signal-list">
                {authorityLedger.debtItems.slice(0, 4).map((item) => (
                  <div key={item.id} className={`validation-signal-card ${item.severity === "critical" ? "critical" : item.severity === "warning" ? "warning" : "info"}`}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong>{item.title}</strong>
                      <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                    </div>
                    <Link to={item.fixPath} className="link-button-subtle">{item.actionLabel}</Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel validation-subpanel">
            <div className="validation-subpanel-header">
              <h3 style={{ margin: 0 }}>Weakest site authority right now</h3>
              <span className="badge-soft">{authorityLedger.siteReviews.filter((item) => item.status !== "ready").length}</span>
            </div>
            {authorityLedger.siteReviews.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No site authority rows are available yet.</p>
            ) : (
              <div className="validation-signal-list">
                {authorityLedger.siteReviews.slice(0, 3).map((item) => (
                  <div key={item.siteId} className={`validation-signal-card ${item.status === "pending" ? "critical" : item.status === "partial" ? "warning" : "info"}`}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <strong>{item.siteName}</strong>
                      <p className="muted" style={{ margin: 0 }}>{item.detail}</p>
                    </div>
                    <Link to={item.fixPath} className="link-button-subtle">Open Core Model</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="validation-next-actions">
          <div className="panel validation-subpanel">
            <div className="validation-subpanel-header">
              <h3 style={{ margin: 0 }}>Strong signals</h3>
              <span className="badge-soft">{readinessSummary.strengths.length}</span>
            </div>
            {readinessSummary.strengths.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>SubnetOps has not detected strong trust anchors yet.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {readinessSummary.strengths.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
          </div>

          <div className="panel validation-subpanel">
            <div className="validation-subpanel-header">
              <h3 style={{ margin: 0 }}>Recommended next fixes</h3>
              <span className="badge-soft">{readinessSummary.nextActions.length}</span>
            </div>
            {readinessSummary.nextActions.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>No immediate jump suggestions are available right now.</p>
            ) : (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {readinessSummary.nextActions.map((item) => (
                  <Link key={`${item.label}-${item.path}`} to={item.path} className="link-button-subtle">{item.label}</Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
        <div className="panel"><p className="muted" style={{ marginBottom: 8 }}>Errors</p><h2 style={{ margin: 0 }}>{errorCount}</h2></div>
        <div className="panel"><p className="muted" style={{ marginBottom: 8 }}>Warnings</p><h2 style={{ margin: 0 }}>{warningCount}</h2></div>
        <div className="panel"><p className="muted" style={{ marginBottom: 8 }}>Info</p><h2 style={{ margin: 0 }}>{infoCount}</h2></div>
        <div className="panel"><p className="muted" style={{ marginBottom: 8 }}>Health</p><h2 style={{ margin: 0 }}>{healthLabel(errorCount, warningCount)}</h2></div>
      </div>

      <div className="grid-2" style={{ alignItems: "start", gridTemplateColumns: "1.35fr 0.9fr" }}>
        <div className="panel">
          <div className="toolbar-row" style={{ marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
            <input
              placeholder="Search findings, rules, or messages"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as "all" | "ERROR" | "WARNING" | "INFO") }>
              <option value="all">All severities</option>
              <option value="ERROR">Errors</option>
              <option value="WARNING">Warnings</option>
              <option value="INFO">Info</option>
            </select>
            <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value as "all" | "PROJECT" | "SITE" | "VLAN") }>
              <option value="all">All entities</option>
              <option value="PROJECT">Project</option>
              <option value="SITE">Site</option>
              <option value="VLAN">VLAN</option>
            </select>
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span className="badge-soft">Showing {filteredItems.length} of {items.length}</span>
            {severityFilter !== "all" ? <span className="badge-soft">Severity: {severityFilter}</span> : null}
            {entityFilter !== "all" ? <span className="badge-soft">Entity: {entityFilter}</span> : null}
            {categoryFilter !== "all" ? <span className="badge-soft">Category: {categoryFilter}</span> : null}
          </div>

          {validationQuery.isLoading ? (
            <LoadingState title="Loading validation" message="Gathering validation findings and preparing the review workspace." />
          ) : validationQuery.isError ? (
            <ErrorState
              title="Unable to load validation results"
              message={validationQuery.error instanceof Error ? validationQuery.error.message : "SubnetOps could not load validation right now."}
              action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
            />
          ) : (
            <div style={{ display: "grid", gap: 14 }}>
              {groupedItems.length === 0 ? (
                <ValidationList items={[]} emptyTitle="No findings match this view" emptyMessage="Try broadening the filters or run validation again after changing the design." />
              ) : groupedItems.map(([category, categoryItems]) => (
                <div key={category} style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0 }}>{category}</h3>
                    <span className="badge-soft">{categoryItems.length} finding{categoryItems.length === 1 ? "" : "s"}</span>
                  </div>
                  <ValidationList
                    items={categoryItems}
                    openTaskBodies={openTaskBodies}
                    onConvertToTask={async (item) => {
                      const body = `[Validation] ${item.title} — ${item.message}`;
                      if (openTaskBodies.has(body)) {
                        window.alert("A task for this validation finding already exists.");
                        return;
                      }

                      await createCommentMutation.mutateAsync({
                        body,
                        taskStatus: "OPEN",
                        targetType: item.entityType === "SITE" ? "SITE" : item.entityType === "VLAN" ? "VLAN" : "PROJECT",
                        targetId: item.entityId || undefined,
                      });
                    }}
                    onExplain={(item) => {
                      setSelectedItem(item);
                      explainMutation.reset();
                      explainMutation.mutate({
                        title: item.title,
                        message: item.message,
                        severity: item.severity,
                        entityType: item.entityType,
                      }, {
                        onSettled: () => {
                          setTimeout(() => insightRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
                        },
                      });
                    }}
                    getFixPath={(item) => buildValidationFixPath(projectId, item)}
                    getFixLabel={(item) => validationFixLabel(item)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div ref={insightRef} style={{ display: "grid", gap: 12 }}>
          <div className="panel">
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Review guidance</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>Fix errors before treating the logical design as handoff-ready.</li>
              <li>Warnings usually indicate design debt, growth pressure, or convention drift.</li>
              <li>Each finding can now jump directly into the related site, VLAN, or requirements area.</li>
              <li>Convert recurring issues into tasks so they stay visible in the project workflow.</li>
            </ul>
          </div>

          <div className="panel">
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>AI suggest a fix</h2>
            <p className="muted" style={{ margin: 0 }}>
              Pick any validation finding and SubnetOps will explain the issue, why it matters, and the most likely fixes to try next.
            </p>
          </div>

          {selectedItem ? (
            <div className="panel">
              <strong style={{ display: "block", marginBottom: 6 }}>Selected finding</strong>
              <p className="muted" style={{ margin: 0 }}>{selectedItem.title}</p>
            </div>
          ) : null}
          {explainMutation.isPending ? <div className="panel"><p className="muted">Generating suggested fixes...</p></div> : null}
          {explainMutation.isError ? <div className="panel"><p className="error-text">{explainMutation.error instanceof Error ? explainMutation.error.message : "Could not generate a suggested fix right now."}</p></div> : null}
          {selectedItem && explainMutation.data ? <AIValidationInsight item={selectedItem} explanation={explainMutation.data} /> : null}
        </div>
      </div>
    </section>
  );
}
