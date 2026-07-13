import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

type Role = 'SUPER_ADMIN' | 'MANAGER' | 'STAFF' | 'DEVELOPER';

interface Props {
  roles: Role[];
  children: React.ReactNode;
}

export default function RequireRole({ roles, children }: Props) {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
