import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <section style={{ display: "grid", gap: 18 }}>
      <section className="panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">NetWorks</span>
          <span className="badge-soft">SubnetOps</span>
          <span className="badge-soft">Toronto, Ontario, Canada</span>
        </div>

        <div>
          <h1 style={{ marginBottom: 10 }}>About NetWorks</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            NetWorks is a Toronto, Ontario, Canada–based software company focused on building practical tools for network planning and infrastructure workflows.
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            SubnetOps is the first product from NetWorks. It is designed to help users move from requirements to validated logical network plans, clearer documentation, and cleaner technical handoff outputs.
          </p>
          <p className="muted" style={{ marginTop: 8 }}>
            The product is guided by recognized best-practice ideas in modular network design, segmentation, structured security planning, and source-of-truth style documentation, informed by frameworks and guidance such as NIST, CISA, and enterprise network design principles.
          </p>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>What the product is built around</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>guided network planning instead of generic project tracking</li>
              <li>modular design and structured segmentation thinking</li>
              <li>human-reviewed source-of-truth style documentation</li>
              <li>clear logical design, validation, diagram, and handoff output</li>
              <li>standards-informed planning language that supports real-world review and implementation</li>
            </ul>
          </div>

          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>Company direction</h2>
            <p className="muted" style={{ margin: 0 }}>
              NetWorks will expand over time with additional products and software focused on practical infrastructure and network workflows.
            </p>
            <p className="muted" style={{ margin: 0 }}>
              Created and programmed by <strong>Rizwan Chohan</strong>.
            </p>
          </div>
        </div>


        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>Methodology and design principles</h2>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li>requirements first, then logical design, then validation</li>
              <li>segmentation and trust boundaries as core design inputs</li>
              <li>structured addressing and subnet hierarchy for realistic planning</li>
              <li>operations, manageability, and handoff outputs built into the workflow</li>
            </ul>
          </div>

          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>What this means in practice</h2>
            <p className="muted" style={{ margin: 0 }}>
              SubnetOps is intended to help users reason through network structure before implementation. The product aims to support better review conversations around segmentation, WAN design, hybrid boundaries, addressing policy, and operational readiness.
            </p>
          </div>
        </div>
        <div className="trust-note">
          <strong>How SubnetOps is meant to be used</strong>
          <p className="muted" style={{ margin: "6px 0 0 0" }}>
            Start with requirements, move into logical design, validate the plan, review the diagram, and then export a cleaner handoff output.
          </p>
        </div>

        <div className="form-actions">
          <Link to="/register"><button type="button">Get Started</button></Link>
          <Link to="/projects/new" className="link-button">Start a Network Plan</Link>
        </div>
      </section>
    </section>
  );
}
