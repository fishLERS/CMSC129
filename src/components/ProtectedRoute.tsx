import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

type Props = { children: JSX.Element; requireAdmin?: boolean };

export default function ProtectedRoute({ children, requireAdmin }: Props) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  const [checking, setChecking] = React.useState(!!requireAdmin);
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    async function check() {
      if (!requireAdmin) {
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
  }, [requireAdmin, user]);

  if (loading || checking) return <div style={{ padding: 24 }}>loading…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (requireAdmin && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}
