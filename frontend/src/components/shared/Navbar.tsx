// src/components/shared/Navbar.tsx
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import ThemeToggle from './ThemeToggle';
import { useAuth, UserRole } from '../../hooks/useAuth';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/features', label: 'Features' },
  { to: '/how-it-works', label: 'How It Works' },
  { to: '/contact-sales', label: 'Contact Sales' },
  { to: '/book-demo', label: 'Book Demo' },
]

type NavItem = { to: string; label: string }

const linksByRole: Record<Exclude<UserRole, null>, NavItem[]> = {
  candidate: [
    { to: '/register', label: 'Candidate Form' },
    { to: '/interview', label: 'Interview' },
  ],
  hr: [
    { to: '/schedule', label: 'Schedule' },
    { to: '/job-setup', label: 'Job Setup' },
    { to: '/hr', label: 'HR Dashboard' },
  ],
  admin: [
    { to: '/admin/dashboard', label: 'Admin Dashboard' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/analytics', label: 'Analytics' },
    { to: '/admin/settings', label: 'Settings' },
  ],
}

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-full px-4 py-2 text-sm transition ${isActive
    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10'}`;

export default function Navbar() {
  const { token, role, isInternal, logout } = useAuth()
  const location = useLocation()
  const isLanding = location.pathname === '/'

  // ✅ FIX: authenticated ko yahan declare karo — sabse pehle
  const authenticated = !!token

  if (isLanding) {
    if (authenticated && role === 'admin') {
      return (
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/60">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
<Link to="/" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Pratibha<span className="text-emerald-600">AI</span>
           </Link>
            <div className="flex items-center gap-3">
              <NavLink to="/admin/dashboard" className={linkClass}>Admin Dashboard</NavLink>
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-sm font-medium transition text-slate-700 hover:bg-red-50 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                Logout
              </button>
              <ThemeToggle />
            </div>
          </div>
        </header>
      )
    }

    return (
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pratibha<span className="text-emerald-600">AI</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 transition hover:border-slate-400 dark:hover:border-slate-600"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
            >
              Start Interview
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
    );
  }

  const isAdminRoute = location.pathname.startsWith('/admin')
  const baseRoleLinks = linksByRole[role!] || []

  let navItems: NavItem[]

  if (isAdminRoute) {
    navItems = baseRoleLinks.filter((item) => item.to === '/admin/dashboard')
  } else if (role === 'hr') {
    // ✅ Role-based visibility for HR:
    // - Pratibha AI internal staff (isInternal = true): Schedule, Job Setup, HR Dashboard (no Billing)
    // - Client HR/Admin (isInternal = false): only Billing (no Schedule/Job Setup/HR Dashboard)
    navItems = isInternal
      ? baseRoleLinks // Schedule, Job Setup, HR Dashboard
      : [{ to: '/hr/billing', label: 'Billing' }]
  } else if (role) {
    navItems = baseRoleLinks
  } else {
    navItems = publicLinks
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-lg font-semibold tracking-wide text-slate-900 dark:text-white">
            Pratibha<span className="text-emerald-600">AI</span>
          </Link>
          {authenticated && (
            <span className="hidden text-xs text-slate-500 dark:text-slate-400 sm:inline capitalize">
              {role} panel
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {item.label}
              </NavLink>
            ))}
            {authenticated ? (
              <button
                onClick={logout}
                className="rounded-full px-4 py-2 text-sm font-medium transition text-slate-700 hover:bg-red-50 hover:text-red-600 dark:text-slate-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              >
                Logout
              </button>
            ) : (
              <NavLink to="/login" className={linkClass}>Login</NavLink>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  );
}
