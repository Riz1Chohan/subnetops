import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useCurrentUser } from "../../features/auth/hooks";
import { LoadingState } from "./LoadingState";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { data, isLoading, error } = useCurrentUser();

  if (isLoading) {
    return <main className="page"><LoadingState title="Checking session" message="Please wait while SubnetOps verifies your login." /></main>;
  }

  if (error || !data?.user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
