import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { LoadingState } from "../common/LoadingState";
import { useAuth } from "../../modules/auth/AuthContext";

type PublicOnlyRouteProps = {
  children: ReactNode;
};

export function PublicOnlyRoute({ children }: PublicOnlyRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingState label="Memeriksa status masuk..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
