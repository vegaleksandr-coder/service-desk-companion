import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppRole = "admin" | "executor" | "user";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: AppRole | AppRole[];
  allowUserManagers?: boolean;
}

export function ProtectedRoute({ children, requiredRole, allowUserManagers }: ProtectedRouteProps) {
  const { user, role, profile, isLoading, isGlobalAdmin, companies, currentCompanyId } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!currentCompanyId && companies.length > 0) {
    return <Navigate to="/select-company" replace />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = role && roles.includes(role);
    const isUserManager = allowUserManagers && profile?.can_manage_users;
    if (!hasRole && !isUserManager && !isGlobalAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}
