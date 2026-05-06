import { Link, useNavigate } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";
import { AIPlanningPanel, type AIUseDraftOptions } from "../features/ai/components/AIPlanningPanel";
import type { AIPlanDraft } from "../lib/types";

const AI_DRAFT_STORAGE_KEY = "subnetops.aiDraftSelection";

export function AIWorkspacePage() {
  const navigate = useNavigate();

  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="AI workspace"
        description="Use AI planning separately from the guided planner. AI output stays draft-only: review it here, then carry selected parts into Start Plan as structured inputs that still need review."
      />

      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>How this workspace is used</h2>
        <p className="muted" style={{ margin: 0 }}>
          The AI workspace is kept separate so the guided planner can stay focused and structured. Generate a draft here, choose what to keep, and then continue in Start Plan. AI output is not an approved engineering fact; deterministic design checks must accept or reject it.
        </p>
        <div className="form-actions">
          <button type="button" onClick={() => navigate("/projects/new")}>Return to Start Plan</button>
          <Link to="/dashboard/help" className="link-button">Open Help</Link>
        </div>
      </section>

      <AIPlanningPanel
        onUseDraft={(draft: AIPlanDraft, options: AIUseDraftOptions) => {
          sessionStorage.setItem(AI_DRAFT_STORAGE_KEY, JSON.stringify({ draft, options }));
          navigate("/projects/new");
        }}
      />
    </section>
  );
}
