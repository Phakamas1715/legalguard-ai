import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Props {
  children: React.ReactNode;
  requiredTier?: "free" | "pro" | "team" | "enterprise";
}

/**
 * Wraps routes that require authentication.
 * Redirects to /auth if not logged in.
 * Optionally checks subscription tier.
 */
const ProtectedRoute = ({ children, requiredTier }: Props) => {
  const { isAuthenticated, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (requiredTier && profile) {
    const tierOrder = ["free", "pro", "team", "enterprise"];
    const userLevel = tierOrder.indexOf(profile.tier);
    const requiredLevel = tierOrder.indexOf(requiredTier);
    if (userLevel < requiredLevel) {
      return <Navigate to="/pricing" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
