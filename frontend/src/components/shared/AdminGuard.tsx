import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export default function AdminGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')
  if (!token || role !== 'admin') {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}
