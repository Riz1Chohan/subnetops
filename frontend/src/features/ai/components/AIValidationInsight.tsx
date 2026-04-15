import type { AIValidationExplanation, ValidationResult } from "../../../lib/types";

function providerLabel(provider: AIValidationExplanation["provider"]) {
  return provider === "openai" ? "Enhanced AI mode" : "Local explanation mode";
}

export function AIValidationInsight({ item, explanation }: { item: ValidationResult; explanation: AIValidationExplanation }) {
  return (
    <section className="panel" style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: "0 0 6px 0" }}>AI explanation</h3>
          <p className="muted" style={{ margin: 0 }}>{item.title}</p>
        </div>
        <span className="badge badge-info">{providerLabel(explanation.provider)}</span>
      </div>

      <div className="trust-note">
        <strong>How to use this</strong>
        <p className="muted" style={{ margin: "6px 0 0 0" }}>
          Treat this as guidance to speed up review. Confirm the actual subnet, gateway, or segmentation intent before making changes.
        </p>
      </div>

      <div className="validation-card">
        <strong>What it means</strong>
        <p style={{ marginBottom: 0 }}>{explanation.explanation}</p>
      </div>

      <div className="validation-card">
        <strong>Why it matters</strong>
        <p style={{ marginBottom: 0 }}>{explanation.whyItMatters}</p>
      </div>

      <div className="validation-card">
        <strong>Suggested fixes</strong>
        <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
          {explanation.suggestedFixes.map((fix) => (
            <li key={fix}>{fix}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
