import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useInterviewStore } from '../../store/interviewStore'

export default function RegistrationGuard({ children, redirectTo = '/register' }: { children: ReactNode; redirectTo?: string }) {
  const profile = useInterviewStore((s) => s.profile)
  const isComplete = !!profile.candidateId || !!profile.name

  if (!isComplete) {
    return <Navigate to={redirectTo} replace />
  }
  return <>{children}</>
}
