import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "../common/LoadingState";
import { useAuth } from "../../modules/auth/AuthContext";

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingState label="Memulihkan sesi masuk..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
