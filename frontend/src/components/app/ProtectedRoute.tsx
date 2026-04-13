import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../../features/auth/hooks";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <p className="page muted">Checking session...</p>;
  }

  if (error || !data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
