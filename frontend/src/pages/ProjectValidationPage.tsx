import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ValidationList } from "../features/validation/components/ValidationList";
import { useRunValidation, useValidationResults } from "../features/validation/hooks";
import { useCreateProjectComment, useProjectComments } from "../features/comments/hooks";
import { useExplainValidationFinding } from "../features/ai/hooks";
import type { ValidationResult } from "../lib/types";
import { AIValidationInsight } from "../features/ai/components/AIValidationInsight";
import { buildValidationFixPath, validationFixLabel } from "../lib/validationFixLink";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";

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
  const validationQuery = useValidationResults(projectId);
  const validationMutation = useRunValidation(projectId);
  const commentsQuery = useProjectComments(projectId);
  const createCommentMutation = useCreateProjectComment(projectId);
  const explainMutation = useExplainValidationFinding();
  const [selectedItem, setSelectedItem] = useState<ValidationResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "ERROR" | "WARNING" | "INFO">("all");
  const [entityFilter, setEntityFilter] = useState<"all" | "PROJECT" | "SITE" | "VLAN">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");

  const items = validationQuery.data ?? [];
  const errorCount = items.filter((item) => item.severity === "ERROR").length;
  const warningCount = items.filter((item) => item.severity === "WARNING").length;
  const infoCount = items.filter((item) => item.severity === "INFO").length;
  const categories = Array.from(new Set(items.map((item) => categoryForRule(item.ruleCode)))).sort();

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
                      explainMutation.mutate({
                        title: item.title,
                        message: item.message,
                        severity: item.severity,
                        entityType: item.entityType,
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

        <div style={{ display: "grid", gap: 12 }}>
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
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>AI explain this issue</h2>
            <p className="muted" style={{ margin: 0 }}>
              Pick any validation finding and SubnetOps will explain what it means, why it matters, and what to fix next.
            </p>
          </div>

          {explainMutation.isPending ? <div className="panel"><p className="muted">Generating explanation...</p></div> : null}
          {selectedItem && explainMutation.data ? <AIValidationInsight item={selectedItem} explanation={explainMutation.data} /> : null}
        </div>
      </div>
    </section>
  );
}
