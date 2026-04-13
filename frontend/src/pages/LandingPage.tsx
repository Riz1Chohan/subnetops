import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <section className="hero">
      <div className="panel">
        <h1>Start with requirements. End with a validated network plan.</h1>
        <p>
          SubnetOps is a guided network planning workspace from NetWorks. Capture real requirements,
          shape the logical design, validate key decisions early, and produce cleaner handoff outputs.
          The workflow is built around structured planning ideas such as segmentation, modular design,
          addressing hierarchy, and review-ready documentation.
        </p>
        <div className="actions">
          <Link to="/register"><button type="button">Get started</button></Link>
          <Link to="/login" className="link-button">Login</Link>
          <Link to="/about" className="link-button">About</Link>
        </div>
      </div>
    </section>
  );
}
