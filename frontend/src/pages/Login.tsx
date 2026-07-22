import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'

function formatApiError(error: any, fallback: string) {
  const detail = error?.response?.data?.detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = item?.loc?.slice?.(-1)?.[0]
        return field ? `${field}: ${item.msg}` : item?.msg
      })
      .filter(Boolean)
      .join(' ')
  }
  if (error?.code === 'ECONNABORTED') {
    return 'Backend is not responding. Start FastAPI on port 8001, then try again.'
  }
  if (error?.code === 'ERR_NETWORK' || !error?.response) {
    return 'Cannot reach backend API. Confirm backend is running at http://127.0.0.1:8001.'
  }
  return detail || fallback
}

export default function Login() {
  const [email, setEmail] = useState('hr@aiinterviewer.com')
  const [password, setPassword] = useState('password123')
  const [name, setName] = useState('HR Manager')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<'candidate' | 'hr' | 'admin'>('candidate')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const resolveRedirectTarget = (): string | null => {
    const redirect = searchParams.get('redirect')
    const upgrade = searchParams.get('upgrade')
    if (redirect) {
      return upgrade ? `${redirect}?upgrade=${upgrade}` : redirect
    }
    return null
  }

  const authPayload = () => ({ email, password })

  const register = async () => {
    setLoading(true)
    setMessage('Creating account...')
    try {
      await api.post('/auth/register', { ...authPayload(), name, role, company: company || undefined })
      setMessage('Registration successful!')
    } catch (error: any) {
      setMessage(formatApiError(error, 'Register failed. Check backend server, email, name, and password.'))
      setLoading(false)
      return
    }
    try {
      const { data } = await api.post('/auth/login', authPayload())
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('is_internal', data.is_internal ? 'true' : 'false')
      const redirectTarget = resolveRedirectTarget()
      if (redirectTarget) {
        navigate(redirectTarget)
      } else {
        navigate(role === 'hr' ? '/hr' : role === 'admin' ? '/admin/dashboard' : '/register')
      }
    } catch (error: any) {
      setMessage(formatApiError(error, 'Registered successfully, but auto-login failed. Click Login once.'))
    } finally {
      setLoading(false)
    }
  }

  const login = async () => {
    setLoading(true)
    setMessage('Signing in...')
    try {
      const { data } = await api.post('/auth/login', authPayload())
      localStorage.setItem('token', data.access_token)
      const resolvedRole = data.role || role
      localStorage.setItem('role', resolvedRole)
      localStorage.setItem('is_internal', data.is_internal ? 'true' : 'false')
      window.dispatchEvent(new Event('roleChange'))
      setMessage('Login successful!')

      const redirectTarget = resolveRedirectTarget()
      if (redirectTarget) {
        navigate(redirectTarget)
      } else if (resolvedRole === 'admin') {
        navigate('/admin/dashboard')
      } else if (resolvedRole === 'hr') {
        navigate('/hr')
      } else if (data.assigned_job_id) {
        navigate(`/register?jobId=${data.assigned_job_id}`)
      } else {
        navigate('/register')
      }
    } catch (error: any) {
      if (error?.response?.status === 401) {
        setMessage('Invalid credentials. Register first, or check the email/password.')
      } else {
        setMessage(formatApiError(error, 'Login failed. Check backend server.'))
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-emerald-400'

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Image Section */}
        <div className="hidden lg:flex justify-center">
          <img
            src="/image/login_page.png"
            alt="AI Interviewer"
            className="w-full h-auto max-w-md rounded-3xl shadow-lg"
          />
        </div>

        {/* Login Form Section */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Login</h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            Access HR dashboard or candidate flow.
          </p>

          <div className="grid gap-3">
          <select
            className={inputClass}
            value={role}
            onChange={(e) => setRole(e.target.value as 'candidate' | 'hr' | 'admin')}
          >
            <option value="admin">Admin</option>
            <option value="hr">HR</option>
            <option value="candidate">Candidate</option>
          </select>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
          />
          {role === 'hr' && (
            <input
              className={inputClass}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Company Name"
            />
          )}
          <input
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <div className="relative">
            <input
              className={`${inputClass} pr-12`}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex gap-3">
    <button
      onClick={register}
      disabled={loading}
      className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 font-medium text-slate-900 dark:text-slate-100 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-slate-800"
    >
      {loading ? 'Please wait...' : 'Register'}
    </button>
    <button
      onClick={login}
      disabled={loading}
      className="flex-1 rounded-2xl bg-emerald-500 px-4 py-3 font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? 'Please wait...' : 'Login'}
    </button>
          </div>
          {message && (
            <div className={`rounded-2xl border-2 px-4 py-4 text-sm break-all whitespace-pre-line ${
              message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('invalid') || message.toLowerCase().includes('cannot')
                ? '!border-red-500 !bg-red-500/15 !text-red-200 font-semibold shadow-lg shadow-red-500/20'
                : message.toLowerCase().includes('success')
                ? '!border-emerald-500 !bg-emerald-500/15 !text-emerald-200 font-semibold'
                : 'border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
            }`}>
              <span className="font-bold">⚠️ </span>
              {message}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
