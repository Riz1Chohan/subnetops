import { Link, Outlet } from "react-router-dom";
import { Brand } from "../components/app/Brand";

export function PublicLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Brand to="/" showCompany />
        <nav>
          <Link to="/">Home</Link>
          <Link to="/about">About</Link>
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
