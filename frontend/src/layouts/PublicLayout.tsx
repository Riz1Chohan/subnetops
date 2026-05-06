import { Link, Outlet } from "react-router-dom";
import { Brand } from "../components/app/Brand";

export function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-brand-row">
          <Brand to="/" showCompany />
          <span className="brand-slogan">Plan networks with clarity.</span>
        </div>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/help">Help</Link>
          <Link to="/faq">FAQ</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Get Started</Link>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </div>
  );
}
