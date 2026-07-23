import { useState, useEffect } from 'react'

export type UserRole = 'candidate' | 'hr' | 'admin' | null

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'))
  const [role, setRole] = useState<UserRole>(() => (localStorage.getItem('role') as UserRole))
  const [candidateId, setCandidateId] = useState<string | null>(() => localStorage.getItem('candidateId'))
  const [isInternal, setIsInternal] = useState<boolean>(() => localStorage.getItem('is_internal') === 'true')

  // ✅ NAYA: Pratibha ke internal HR staff mein "Admin" vs "Employee" ka farak
  // Backend login response mein 'is_super_admin' (true/false) bhejna hoga
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(
    () => localStorage.getItem('is_super_admin') === 'true'
  )

  useEffect(() => {
    const sync = () => {
      setToken(localStorage.getItem('token'))
      setRole(localStorage.getItem('role') as UserRole)
      setCandidateId(localStorage.getItem('candidateId'))
      setIsInternal(localStorage.getItem('is_internal') === 'true')
      setIsSuperAdmin(localStorage.getItem('is_super_admin') === 'true')
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
    localStorage.removeItem('is_super_admin')
    setToken(null)
    setRole(null)
    setCandidateId(null)
    setIsInternal(false)
    setIsSuperAdmin(false)
    window.location.href = '/'
  }

  const isAuthenticated = !!token
  const isCandidate = role === 'candidate'
  const isHR = role === 'hr'
  const isAdmin = role === 'admin'

  return {
    token,
    role,
    candidateId,
    isInternal,
    isSuperAdmin,
    isAuthenticated,
    isCandidate,
    isHR,
    isAdmin,
    logout,
  }
}
