import { useState, useEffect } from 'react'

export type UserRole = 'candidate' | 'hr' | 'admin' | null

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem('role') as UserRole))
  const [candidateId, setCandidateId] = useState<string | null>(() => localStorage.getItem('candidateId'))
  const [isInternal, setIsInternal] = useState<boolean>(() => localStorage.getItem('is_internal') === 'true')

  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('token'))
      setRole(localStorage.getItem('role') as UserRole)
      setCandidateId(localStorage.getItem('candidateId'))
      setIsInternal(localStorage.getItem('is_internal') === 'true')
    }
    window.addEventListener('storage', sync)
    window.addEventListener('roleChange', sync)
    return () => {
      window.removeEventListener('storage', sync)
      window.removeEventListener('roleChange', sync)
    }
  }, [])

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('candidateId')
    localStorage.removeItem('is_internal')
    setToken(null)
    setRole(null)
    setCandidateId(null)
    setIsInternal(false)
    window.location.href = '/'
  }

  const isAuthenticated = !!token
  const isCandidate = role === 'candidate'
  const isHR = role === 'hr'
  const isAdmin = role === 'admin'

  return { token, role, candidateId, isInternal, isAuthenticated, isCandidate, isHR, isAdmin, logout }
}
