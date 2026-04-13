import { Link } from "react-router-dom";

export function AboutPage() {
  return (
    <main className="page" style={{ display: "grid", gap: 18 }}>
      <section className="panel" style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="badge-soft">About SubnetOps</span>
          <span className="badge-soft">NetWorks</span>
        </div>

        <div>
          <h1 style={{ marginBottom: 10 }}>About</h1>
          <p className="muted" style={{ marginTop: 0 }}>
            SubnetOps is a network planning workspace built to make VLAN, subnet, gateway, and validation work easier to manage without falling back to spreadsheets and scattered notes.
          </p>
        </div>

        <div className="grid-2" style={{ alignItems: "start" }}>
          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>Planned company name</h2>
            <p className="muted" style={{ margin: 0 }}>
              The planned name behind this product is <strong>NetWorks</strong>. The company is not yet registered, but this is the name intended for the business and product direction.
            </p>
          </div>

          <div className="panel" style={{ display: "grid", gap: 10 }}>
            <h2 style={{ marginTop: 0, marginBottom: 0 }}>Created by</h2>
            <p className="muted" style={{ margin: 0 }}>
              Programmed and created by <strong>Rizwan Chohan</strong>.
            </p>
          </div>
        </div>

        <div className="panel" style={{ display: "grid", gap: 10 }}>
          <h2 style={{ marginTop: 0, marginBottom: 0 }}>What SubnetOps is trying to solve</h2>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>make network planning feel structured and professional from the start</li>
            <li>reduce mistakes in subnetting, gateways, and segment boundaries</li>
            <li>give teams a cleaner way to review diagrams, reports, and validation findings</li>
            <li>use AI as a draft assistant without taking control away from the user</li>
          </ul>
        </div>

        <div className="form-actions">
          <Link to="/" className="link-button">Back to Home</Link>
          <Link to="/register"><button type="button">Get Started</button></Link>
        </div>
      </section>
    </main>
  );
}
