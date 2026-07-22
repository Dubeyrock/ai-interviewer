import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

export default function HRGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  if (!token || role !== 'hr') {
    // Not logged in or not an HR user – redirect to login
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
