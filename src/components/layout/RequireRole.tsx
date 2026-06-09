import { Navigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { Role } from '@/lib/types';
import { ReactNode } from 'react';
import { ChangePassword } from './ChangePassword';

interface RequireRoleProps {
  role?: Role | Role[];
  children: ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps) {
  const { currentUser, token, isHydrating } = useStore();

  if (!currentUser && token && isHydrating) {
    return <div className="min-h-screen bg-paper p-8 text-sm font-bold text-muted">Loading workspace...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/sign-in" replace />;
  }

  // Forced one-time-password rotation gates everything until completed.
  if (currentUser.mustChangePassword) {
    return <ChangePassword />;
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
