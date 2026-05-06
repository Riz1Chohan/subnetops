import { Navigate, Outlet } from "react-router-dom";
import { useCurrentUser } from "../features/auth/hooks";
import { Brand } from "../components/app/Brand";

export function AuthLayout() {
  const { data, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="page" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <p className="muted">Checking session...</p>
      </div>
    );
  }

  if (data?.user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="page" style={{ minHeight: "100vh", display: "grid", placeItems: "center", gap: 18 }}>
      <Brand to="/" showCompany />
      <div className="panel" style={{ width: "100%", maxWidth: 420 }}>
        <Outlet />
      </div>
    </div>
  );
}
