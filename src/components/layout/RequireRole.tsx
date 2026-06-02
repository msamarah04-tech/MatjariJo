import { Navigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Role } from '@/lib/types';
import { ReactNode } from 'react';

interface RequireRoleProps {
  role?: Role | Role[];
  children: ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/sign-in" replace />;
  }

  if (role) {
    const roles = Array.isArray(role) ? role : [role];
    if (!roles.includes(currentUser.role)) {
      // Redirect based on current role if they don't match
      if (currentUser.role === 'PLATFORM_OWNER') {
        return <Navigate to="/platform/analytics" replace />;
      } else {
        return <Navigate to="/admin" replace />;
      }
    }
  }

  return <>{children}</>;
}
