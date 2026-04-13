import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ValidationList } from "../features/validation/components/ValidationList";
import { useRunValidation, useValidationResults } from "../features/validation/hooks";
import { useCreateProjectComment, useProjectComments } from "../features/comments/hooks";
import { useExplainValidationFinding } from "../features/ai/hooks";
import type { ValidationResult } from "../lib/types";
import { AIValidationInsight } from "../features/ai/components/AIValidationInsight";
import { SectionHeader } from "../components/app/SectionHeader";
import { LoadingState } from "../components/app/LoadingState";
import { ErrorState } from "../components/app/ErrorState";

export function ProjectValidationPage() {
  const { projectId = "" } = useParams();
  const validationQuery = useValidationResults(projectId);
  const validationMutation = useRunValidation(projectId);
  const commentsQuery = useProjectComments(projectId);
  const createCommentMutation = useCreateProjectComment(projectId);
  const explainMutation = useExplainValidationFinding();
  const [selectedItem, setSelectedItem] = useState<ValidationResult | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | "ERROR" | "WARNING" | "INFO">("all");

  const items = validationQuery.data ?? [];
  const filteredItems = useMemo(() => {
    if (severityFilter === "all") return items;
    return items.filter((item) => item.severity === severityFilter);
  }, [items, severityFilter]);
  const errorCount = items.filter((item) => item.severity === "ERROR").length;
  const warningCount = items.filter((item) => item.severity === "WARNING").length;

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Validation"
        description="Review overlaps, gateway issues, and sizing problems in one place."
        actions={
          <button type="button" onClick={() => validationMutation.mutate()} disabled={validationMutation.isPending}>
            {validationMutation.isPending ? "Running..." : "Run Validation"}
          </button>
        }
      />

      <div className="grid-2" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
        <div className="panel"><p className="muted" style={{ marginBottom: 8 }}>Errors</p><h2 style={{ margin: 0 }}>{errorCount}</h2></div>
        <div className="panel"><p className="muted" style={{ marginBottom: 8 }}>Warnings</p><h2 style={{ margin: 0 }}>{warningCount}</h2></div>
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="panel">
          <div className="toolbar-row" style={{ marginBottom: 12, justifyContent: "space-between" }}>
            <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as "all" | "ERROR" | "WARNING" | "INFO") }>
              <option value="all">All findings</option>
              <option value="ERROR">Errors</option>
              <option value="WARNING">Warnings</option>
              <option value="INFO">Info</option>
            </select>
            <span className="badge-soft">Showing {filteredItems.length} of {items.length}</span>
          </div>

          {validationQuery.isLoading ? (
            <LoadingState title="Loading validation" message="Gathering validation findings and preparing the review list." />
          ) : validationQuery.isError ? (
            <ErrorState
              title="Unable to load validation results"
              message={validationQuery.error instanceof Error ? validationQuery.error.message : "SubnetOps could not load validation right now."}
              action={<Link to={`/projects/${projectId}/overview`} className="link-button">Back to Overview</Link>}
            />
          ) : (
            <ValidationList
              items={filteredItems}
              onConvertToTask={async (item) => {
                const body = `[Validation] ${item.title} — ${item.message}`;
                const existing = (commentsQuery.data ?? []).some((comment) => comment.body === body);
                if (existing) {
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
            />
          )}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
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
