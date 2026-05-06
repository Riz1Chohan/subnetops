import { Link } from "react-router-dom";
import { SectionHeader } from "../components/app/SectionHeader";

const helpSections = [
  {
    title: "Start with requirements",
    body: "Use Start Plan to capture the business context, design goals, addressing strategy, operations model, physical site assumptions, WAN behavior, and handoff needs before you move into detailed design work.",
  },
  {
    title: "Use AI separately",
    body: "The AI workspace is separate on purpose. It can help create a draft, but the guided planner remains the main structured path for building and reviewing a realistic network plan.",
  },
  {
    title: "Review before handoff",
    body: "Work through Requirements, Logical Design, Validation, Diagram, and Report / Export in order. The later sections are easier to trust when the earlier planning inputs are complete.",
  },
];

export function HelpPage() {
  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Help"
        description="Use this page as a quick reference while building a network plan in SubnetOps."
      />

      <section className="grid-2" style={{ alignItems: "start" }}>
        {helpSections.map((section) => (
          <article key={section.title} className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ margin: 0 }}>{section.title}</h2>
            <p className="muted" style={{ margin: 0 }}>{section.body}</p>
          </article>
        ))}
      </section>

      <section className="panel" style={{ display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Quick navigation</h2>
        <div className="form-actions">
          <Link to="/projects/new"><button type="button">Start Plan</button></Link>
          <Link to="/ai" className="link-button">Open AI workspace</Link>
          <Link to="/faq" className="link-button">Frequently asked questions</Link>
        </div>
      </section>
    </section>
  );
}
