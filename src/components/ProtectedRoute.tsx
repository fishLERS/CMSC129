import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Props = { children: JSX.Element; requireAdmin?: boolean; forbidAdmin?: boolean };

export default function ProtectedRoute({ children, requireAdmin, forbidAdmin }: Props) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const [checking, setChecking] = React.useState(!!(requireAdmin || forbidAdmin));
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function check() {
      // Only check token claims if we need to know admin status (either to require admin
      // or to forbid admin access to a route).
      if (!requireAdmin && !forbidAdmin) {
        setChecking(false);
        return;
      }
      if (!user) {
        setChecking(false);
        return;
      }
      try {
        const idTokenResult = await user.getIdTokenResult();
        if (mounted) setIsAdmin(!!idTokenResult.claims.admin);
      } catch (e) {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setChecking(false);
      }
    }
    check();
    return () => { mounted = false; };
  }, [requireAdmin, forbidAdmin, user]);

  if (loading || checking) return <div style={{ padding: 24 }}>loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (requireAdmin && !isAdmin) return <Navigate to="/student" replace />;
  if (forbidAdmin && isAdmin) return <Navigate to="/admindashboard" replace />;
  return children;
}
