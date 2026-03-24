import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTelemetry } from '../hooks/useTelemetry';
import LoadingOverlay from './LoadingOverlay';

type Props = {
  children: JSX.Element;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  forbidAdmin?: boolean;
};

export default function ProtectedRoute({ children, requireAdmin, requireSuperAdmin, forbidAdmin }: Props) {
  const { user, loading, isAdmin, isSuperAdmin } = useAuth();
  const loc = useLocation();
  const { trackUnauthorizedRouteHit } = useTelemetry();
  const lastUnauthorizedKeyRef = React.useRef<string>("");

  let unauthorizedAction: string | null = null;

  if (loading) return <LoadingOverlay show message="Checking your session..." />;
  
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  
  if (requireAdmin && !isAdmin) {
    unauthorizedAction = "require_admin";
    console.warn('Access denied: Admin required. User role:', user?.role, 'Is admin:', isAdmin);
  } else if (requireSuperAdmin && !isSuperAdmin) {
    unauthorizedAction = "require_super_admin";
    console.warn('Access denied: Super Admin required. User role:', user?.role, 'Is super admin:', isSuperAdmin);
  } else if (forbidAdmin && isAdmin) {
    unauthorizedAction = "forbid_admin";
    console.warn('Access denied: Student only. User is admin.');
  }

  React.useEffect(() => {
    if (!unauthorizedAction) return;
    const key = `${unauthorizedAction}:${loc.pathname}:${user?.uid || "unknown"}`;
    if (lastUnauthorizedKeyRef.current === key) return;
    lastUnauthorizedKeyRef.current = key;
    trackUnauthorizedRouteHit({
      path: loc.pathname,
      action: unauthorizedAction,
      actorRole: user?.role,
      isSuperAdmin,
    });
  }, [loc.pathname, unauthorizedAction, trackUnauthorizedRouteHit, user?.uid, user?.role, isSuperAdmin]);

  if (unauthorizedAction === "require_admin") {
    return <Navigate to="/student" replace />;
  }

  if (unauthorizedAction === "require_super_admin" || unauthorizedAction === "forbid_admin") {
    return <Navigate to="/admindashboard" replace />;
  }
  
  return children;
}
