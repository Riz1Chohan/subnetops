import { SectionHeader } from "../components/app/SectionHeader";

const faqItems = [
  {
    question: "What is SubnetOps meant to do?",
    answer: "SubnetOps is a guided network planning workspace. It helps capture requirements, shape the logical design, validate key decisions, review the diagram, and prepare a cleaner handoff output.",
  },
  {
    question: "When should I use the AI workspace?",
    answer: "Use AI when you want a draft starting point. Use the main guided planner when you want to build or review the plan in a structured step-by-step way.",
  },
  {
    question: "Why does the planner ask about security, WAN, and operations so early?",
    answer: "Those choices affect segmentation, addressing, topology, resilience, and the final handoff. The earlier they are captured, the more realistic the plan becomes.",
  },
  {
    question: "Does the diagram replace requirements and validation?",
    answer: "No. The diagram is a core output, but it should reflect the planning decisions already captured in Requirements, Logical Design, and Validation.",
  },
];

export function FaqPage() {
  return (
    <section style={{ display: "grid", gap: 18 }}>
      <SectionHeader
        title="Frequently asked questions"
        description="Common questions about how the product is meant to be used."
      />

      <section style={{ display: "grid", gap: 12 }}>
        {faqItems.map((item) => (
          <details key={item.question} className="panel faq-item">
            <summary>{item.question}</summary>
            <p className="muted" style={{ margin: "10px 0 0 0" }}>{item.answer}</p>
          </details>
        ))}
      </section>
    </section>
  );
}
