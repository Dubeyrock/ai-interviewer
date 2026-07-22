import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

export default function CandidateGuard({ children }: { children: ReactNode }) {
  const token = localStorage.getItem('token')
  const role = localStorage.getItem('role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (role === 'hr') {
    return <Navigate to="/hr" replace />
  }

  return <>{children}</>
}
