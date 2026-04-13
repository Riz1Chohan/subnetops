import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <main className="hero">
      <div className="panel">
        <h1>Plan VLANs and IP ranges without spreadsheet chaos.</h1>
        <p>
          SubnetOps helps small IT teams design networks faster, catch subnet mistakes early,
          and export clean documentation that is actually usable.
        </p>
        <div className="actions">
          <Link to="/register"><button type="button">Get started</button></Link>
          <Link to="/login" className="link-button">Login</Link>
        </div>
      </div>
    </main>
  );
}
