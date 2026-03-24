import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
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

  if (loading) return <LoadingOverlay show message="Checking your session..." />;
  
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  
  if (requireAdmin && !isAdmin) {
    console.warn('Access denied: Admin required. User role:', user?.role, 'Is admin:', isAdmin);
    return <Navigate to="/student" replace />;
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    console.warn('Access denied: Super Admin required. User role:', user?.role, 'Is super admin:', isSuperAdmin);
    return <Navigate to="/admindashboard" replace />;
  }
  
  if (forbidAdmin && isAdmin) {
    console.warn('Access denied: Student only. User is admin.');
    return <Navigate to="/admindashboard" replace />;
  }
  
  return children;
}
