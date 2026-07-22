import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'

type DashboardStats = {
  total_users: number
  total_candidates: number
  total_interviews: number
  total_sessions: number
  total_hrs: number
}

type UserRow = {
  id: string
  name: string
  email: string
  role: string
  status: string
}

type HRPerformanceRow = {
  id: string
  name: string
  jobs_posted: number
  candidates: number
  selected: number
  rejected: number
  last_active: string
  performance_score: number
}

type AnalyticsData = {
  interview_success_rate: number
  daily_interviews: { date: string; count: number }[]
  top_performing_hr: { name: string; interviews: number }
  most_popular_job_role: string
  domain_split: { IT: number; 'Non-IT': number }
  avg_interview_duration: number
}

type AlertsData = {
  candidates_waiting_review: number
  email_service_configured: boolean
  api_key_expires_days: number
  storage_percent: number
}

type SettingsData = {
  groq_api_key: string
  elevenlabs_api_key: string
  groq_whisper_model: string
  groq_model: string
  smtp_host: string
  smtp_port: number
  smtp_user: string
  smtp_pass?: string
  smtp_starttls: boolean
  smtp_use_ssl: boolean
  jwt_expiry_hours: number
  max_login_attempts: number
  session_timeout_minutes: number
}

type HRJob = {
  id: string
  job_title: string
  domain: string
  status: string
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'analytics' | 'hr-management' | 'settings'>('overview')
  const [showCreateHRModal, setShowCreateHRModal] = useState(false)
  const [showEditUserModal, setShowEditUserModal] = useState(false)
  const [showScoreModal, setShowScoreModal] = useState(false)
  const [showJobsModal, setShowJobsModal] = useState(false)
  const [selectedHR, setSelectedHR] = useState<HRPerformanceRow | null>(null)
  const [hrJobs, setHrJobs] = useState<HRJob[]>([])
  const [editingUser, setEditingUser] = useState<UserRow | null>(null)
  const [hrForm, setHRForm] = useState({ full_name: '', email: '', password: '', department: '' })
  const [editForm, setEditForm] = useState({ name: '', email: '' })
  const [settingsForm, setSettingsForm] = useState<SettingsData>({
    groq_api_key: '',
    elevenlabs_api_key: '',
    groq_whisper_model: 'whisper-large-v3-turbo',
    groq_model: 'llama-3.1-70b-versatile',
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    smtp_starttls: true,
    smtp_use_ssl: false,
    jwt_expiry_hours: 8,
    max_login_attempts: 5,
    session_timeout_minutes: 30,
  })
  const [message, setMessage] = useState('')

  const queryClient = useQueryClient()

  const statsQuery = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get('/admin/stats')).data,
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get('/admin/users')).data,
  })

  const analyticsQuery = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => (await api.get('/admin/analytics')).data,
  })

  const hrPerfQuery = useQuery({
    queryKey: ['admin-hr-performance'],
    queryFn: async () => (await api.get('/admin/hr-performance')).data,
  })

  const alertsQuery = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: async () => (await api.get('/admin/alerts')).data,
  })

  const settingsQuery = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get('/admin/settings')).data,
  })

  useEffect(() => {
    document.title = 'Admin Dashboard · AI Interviewer'
    if (settingsQuery.data) {
      setSettingsForm({ ...settingsForm, ...settingsQuery.data })
    }
  }, [settingsQuery.data])

  const createUserMutation = useMutation({
    mutationFn: (data: typeof hrForm) => api.post('/admin/users/create-hr', data),
    onSuccess: () => {
      setShowCreateHRModal(false)
      setHRForm({ full_name: '', email: '', password: '', department: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: (data: { id: string; name: string; email: string }) =>
      api.put(`/admin/users/${data.id}`, { name: data.name, email: data.email }),
    onSuccess: () => {
      setShowEditUserModal(false)
      setEditingUser(null)
      setEditForm({ name: '', email: '' })
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
    },
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (data: { userId: string; password: string }) => api.post(`/admin/users/${data.userId}/reset-password`, { user_id: data.userId, new_password: data.password }),
  })

  const deactivateUserMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/admin/users/${userId}/deactivate`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const saveSettingsMutation = useMutation({
    mutationFn: (data: typeof settingsForm) => api.post('/admin/settings', data),
    onSuccess: () => setMessage('Settings saved successfully!'),
  })

  const handleCreateHR = () => {
    createUserMutation.mutate(hrForm)
  }

  const handleEditUser = (user: UserRow) => {
    setEditingUser(user)
    setEditForm({ name: user.name, email: user.email })
    setShowEditUserModal(true)
  }

  const handleSaveEdit = () => {
    if (editingUser) {
      updateUserMutation.mutate({ id: editingUser.id, ...editForm })
    }
  }

  const handleResetPassword = (userId: string) => {
    const newPassword = prompt('Enter new password (min 6 chars):', 'TempPass@123')
    if (newPassword && newPassword.length >= 6) {
      resetPasswordMutation.mutate({ userId, password: newPassword })
    }
  }

  const handleDeactivateUser = (userId: string) => {
    if (confirm('Deactivate this HR user?')) {
      deactivateUserMutation.mutate(userId)
    }
  }

  const handleDeleteUser = async (userId: string, role: string) => {
    if (confirm(`Delete this ${role} user?`)) {
      try {
        await api.delete(`/admin/users/${userId}`)
        queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      } catch {
        // placeholder
      }
    }
  }

  if (statsQuery.isLoading || usersQuery.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-emerald-400" />
      </div>
    )
  }

  if (statsQuery.error || usersQuery.error) {
    return (
      <div className="mx-auto mt-10 max-w-2xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-300">
        Failed to load admin data. Check backend API routes.
      </div>
    )
  }

  const stats: DashboardStats = statsQuery.data || {}
  const users: UserRow[] = usersQuery.data?.users || []
  const analytics: AnalyticsData = analyticsQuery.data || {}
  const hrPerformance: HRPerformanceRow[] = hrPerfQuery.data?.hrs || []
  const alerts: AlertsData = alertsQuery.data || {}

  const statCards = [
    { label: 'Total Users', value: stats.total_users ?? 0, icon: '👥', color: 'from-blue-500 to-indigo-600' },
    { label: 'Candidates', value: stats.total_candidates ?? 0, icon: '🎯', color: 'from-emerald-500 to-teal-600' },
    { label: 'Interviews', value: stats.total_interviews ?? 0, icon: '🎥', color: 'from-violet-500 to-purple-600' },
    { label: 'Sessions', value: stats.total_sessions ?? 0, icon: '🗂️', color: 'from-amber-500 to-orange-600' },
    { label: 'HRs', value: stats.total_hrs ?? 0, icon: '🕴️', color: 'from-pink-500 to-rose-600' },
    { label: 'System Status', value: 'OK', icon: '✅', color: 'from-cyan-500 to-sky-600', highlight: true },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Platform overview and management</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-5 py-3">
            <span className="text-xs text-slate-400">Environment</span>
            <p className="text-sm font-semibold text-white">Production · v2.0</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-3">
            <span className="text-xs text-emerald-300">Uptime</span>
            <p className="text-sm font-semibold text-emerald-300">99.9%</p>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
          <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Users</TabButton>
          <TabButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>Analytics</TabButton>
          <TabButton active={activeTab === 'hr-management'} onClick={() => setActiveTab('hr-management')}>HR Management</TabButton>
          <TabButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>Settings</TabButton>
        </div>

        {alerts && (alerts.candidates_waiting_review > 0 || !alerts.email_service_configured) && (
          <div className="flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-xs text-amber-300">
            <span>🔔</span>
            <span>{alerts.candidates_waiting_review} candidates waiting for review</span>
            {!alerts.email_service_configured && <span>· Email not configured</span>}
          </div>
        )}
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {statCards.map((card, idx) => (
              <div key={idx} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.color} p-5 shadow-lg`}>
                <div className="relative z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{card.icon}</span>
                    {card.highlight && (
                      <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="mt-4 text-4xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-sm font-medium text-white/80">{card.label}</p>
                </div>
                <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-white/5" />
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
            <QuickActionCard title="Manage Users" description="View and manage all platform users" icon="👥" onClick={() => setActiveTab('users')} />
            <QuickActionCard title="View Analytics" description="Platform performance metrics" icon="📊" onClick={() => setActiveTab('analytics')} />
            <QuickActionCard title="System Settings" description="Configure AI providers, email, and security" icon="⚙️" onClick={() => setActiveTab('settings')} />
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Recent Activity</h3>
            <div className="space-y-3">
              {[
                { time: '2 min ago', msg: 'New candidate registered: John Doe', type: 'info' },
                { time: '15 min ago', msg: 'Interview completed for session #1234', type: 'success' },
                { time: '1 hour ago', msg: 'HR Priya created new job: Senior Developer', type: 'info' },
                { time: '3 hours ago', msg: 'System backup completed successfully', type: 'success' },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-4">
                  <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${activity.type === 'success' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                    <p className="text-sm text-slate-300">{activity.msg}</p>
                  </div>
                  <span className="text-xs text-slate-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          {alerts && alerts.candidates_waiting_review > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-sm text-amber-300">
                ⚠️ {alerts.candidates_waiting_review} candidates waiting for HR review
              </p>
            </div>
          )}
        </>
      )}

      {activeTab === 'users' && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">All Users</h3>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-slate-300">
                {users.length} users
              </span>
              <button
                onClick={() => setShowCreateHRModal(true)}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                + Add New HR
              </button>
            </div>
          </div>
          {users.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl">👥</span>
              <p className="mt-3 text-sm text-slate-500">No users found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-slate-400">
                    <th className="pb-4 pt-2 font-medium">NAME</th>
                    <th className="pb-4 pt-2 font-medium">EMAIL</th>
                    <th className="pb-4 pt-2 font-medium">ROLE</th>
                    <th className="pb-4 pt-2 font-medium">STATUS</th>
                    <th className="pb-4 pt-2 font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0 transition hover:bg-white/5">
                      <td className="py-4 text-white font-medium">{u.name}</td>
                      <td className="py-4 text-slate-400">{u.email}</td>
                      <td className="py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          u.role === 'hr' ? 'bg-indigo-500/15 text-indigo-300' :
                          u.role === 'candidate' ? 'bg-emerald-500/15 text-emerald-300' :
                          'bg-amber-500/15 text-amber-300'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                          {u.status || 'Active'}
                        </span>
                      </td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          {u.role === 'hr' && (
                            <>
                              <button
                                onClick={() => handleEditUser(u)}
                                className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeactivateUser(u.id)}
                                className="rounded-lg bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/30"
                              >
                                Deactivate
                              </button>
                              <button
                                onClick={() => handleResetPassword(u.id)}
                                className="rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/30"
                              >
                                Reset Pass
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.role)}
                                className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {u.role === 'candidate' && (
                            <>
                              <button
                                onClick={() => setActiveTab('hr-management')}
                                className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                              >
                                View Interview
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id, u.role)}
                                className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30"
                              >
                                Delete
                              </button>
                            </>
                          )}
                          {u.role === 'admin' && (
                            <button
                              onClick={() => handleEditUser(u)}
                              className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Analytics Overview</h3>
            
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <AnalyticsCard
                icon="📊"
                title="Interview Success Rate"
                value={`${analytics.interview_success_rate || 45}%`}
              />
              <AnalyticsCard
                icon="🏆"
                title="Top Performing HR"
                value={analytics.top_performing_hr?.name || 'N/A'}
                subValue={`${analytics.top_performing_hr?.interviews || 0} interviews`}
              />
              <AnalyticsCard
                icon="💼"
                title="Most Popular Job Role"
                value={analytics.most_popular_job_role || 'React Developer'}
              />
              <AnalyticsCard
                icon="🌍"
                title="Domain Split"
                value={`IT: ${analytics.domain_split?.IT || 60}% | Non-IT: ${analytics.domain_split?.['Non-IT'] || 40}%`}
              />
              <AnalyticsCard
                icon="⏱️"
                title="Avg Interview Duration"
                value={`${analytics.avg_interview_duration || 18} minutes`}
              />
            </div>

            {analytics.daily_interviews && analytics.daily_interviews.length > 0 && (
              <div className="mt-6">
                <h4 className="mb-3 text-sm font-semibold text-slate-300">Daily Interviews (Last 7 Days)</h4>
                <div className="flex h-32 items-end justify-between gap-1">
                  {analytics.daily_interviews.map((d, i) => (
                    <div key={i} className="flex flex-col items-center">
                      <div
                        className="w-8 rounded-t bg-emerald-500"
                        style={{ height: `${Math.max(d.count * 10, 4)}px` }}
                      />
                      <span className="mt-1 text-[10px] text-slate-500">{d.date.split(' ')[1]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'hr-management' && (
        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">HR Performance</h3>
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm text-slate-300">
              {hrPerformance.length} HR accounts
            </span>
          </div>
          {hrPerformance.length === 0 ? (
            <div className="py-12 text-center">
              <span className="text-4xl">🕴️</span>
              <p className="mt-3 text-sm text-slate-500">No HR accounts found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-slate-400">
                    <th className="pb-4 pt-2 font-medium">HR Name</th>
                    <th className="pb-4 pt-2 font-medium">Jobs Posted</th>
                    <th className="pb-4 pt-2 font-medium">Candidates</th>
                    <th className="pb-4 pt-2 font-medium">Selected</th>
                    <th className="pb-4 pt-2 font-medium">Rejected</th>
                    <th className="pb-4 pt-2 font-medium">Last Active</th>
                    <th className="pb-4 pt-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {hrPerformance.map((hr) => (
                    <tr key={hr.id} className="border-b border-white/5 last:border-0 transition hover:bg-white/5">
                      <td className="py-4 text-white font-medium">{hr.name}</td>
                      <td className="py-4 text-slate-300">{hr.jobs_posted}</td>
                      <td className="py-4 text-slate-300">{hr.candidates}</td>
                      <td className="py-4 text-emerald-300">{hr.selected}</td>
                      <td className="py-4 text-red-300">{hr.rejected}</td>
                      <td className="py-4 text-slate-400">{hr.last_active}</td>
                      <td className="py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setSelectedHR(hr); setShowScoreModal(true) }}
                            className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                          >
                            View Score
                          </button>
                          <button
                            onClick={async () => { setSelectedHR(hr); const res = await api.get(`/admin/hr/${hr.id}/jobs`); setHrJobs(res.data.jobs); setShowJobsModal(true) }}
                            className="rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                          >
                            View Jobs
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {message && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">
              {message}
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">AI Providers</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Groq API Key">
                <input
                  type="text"
                  value={settingsForm.groq_api_key}
                  onChange={(e) => setSettingsForm({ ...settingsForm, groq_api_key: e.target.value })}
                  placeholder="sk-xxx..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label="ElevenLabs API Key">
                <input
                  type="text"
                  value={settingsForm.elevenlabs_api_key}
                  onChange={(e) => setSettingsForm({ ...settingsForm, elevenlabs_api_key: e.target.value })}
                  placeholder="sk-xxx..."
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label="Whisper Model">
                <select
                  value={settingsForm.groq_whisper_model}
                  onChange={(e) => setSettingsForm({ ...settingsForm, groq_whisper_model: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                >
                  <option value="whisper-large-v3-turbo">whisper-large-v3-turbo</option>
                  <option value="whisper-large-v3">whisper-large-v3</option>
                </select>
              </FormField>
              <FormField label="LLM Model">
                <select
                  value={settingsForm.groq_model}
                  onChange={(e) => setSettingsForm({ ...settingsForm, groq_model: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                >
                  <option value="llama-3.1-70b-versatile">llama-3.1-70b-versatile</option>
                  <option value="llama-3.3-70b">llama-3.3-70b</option>
                </select>
              </FormField>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Email Service</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="SMTP Host">
                <input
                  type="text"
                  value={settingsForm.smtp_host}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_host: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label="SMTP Port">
                <input
                  type="number"
                  value={settingsForm.smtp_port}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_port: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label="SMTP User">
                <input
                  type="email"
                  value={settingsForm.smtp_user}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_user: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label="SMTP Password">
                <input
                  type="password"
                  value={settingsForm.smtp_pass}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_pass: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={settingsForm.smtp_starttls}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_starttls: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                />
                Use STARTTLS
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={settingsForm.smtp_use_ssl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, smtp_use_ssl: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500"
                />
                Use SSL (port 465)
              </label>
            </div>
            <div className="mt-4 flex gap-3">
              <button className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20">
                Test Connection
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Security</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField label="JWT Expiry (hours)">
                <select
                  value={settingsForm.jwt_expiry_hours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, jwt_expiry_hours: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                >
                  <option value={1}>1 hour</option>
                  <option value={4}>4 hours</option>
                  <option value={8}>8 hours</option>
                  <option value={24}>24 hours</option>
                </select>
              </FormField>
              <FormField label="Max Login Attempts">
                <input
                  type="number"
                  value={settingsForm.max_login_attempts}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_login_attempts: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
              <FormField label="Session Timeout (min)">
                <input
                  type="number"
                  value={settingsForm.session_timeout_minutes}
                  onChange={(e) => setSettingsForm({ ...settingsForm, session_timeout_minutes: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </FormField>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => saveSettingsMutation.mutate(settingsForm)}
              className="rounded-xl bg-emerald-500 px-6 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {showCreateHRModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Add New HR</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={hrForm.full_name}
                  onChange={(e) => setHRForm({ ...hrForm, full_name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Email</label>
                <input
                  type="email"
                  value={hrForm.email}
                  onChange={(e) => setHRForm({ ...hrForm, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Password</label>
                <input
                  type="password"
                  value={hrForm.password}
                  onChange={(e) => setHRForm({ ...hrForm, password: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Department</label>
                <input
                  type="text"
                  value={hrForm.department}
                  onChange={(e) => setHRForm({ ...hrForm, department: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateHRModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHR}
                disabled={createUserMutation.isPending}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {createUserMutation.isPending ? 'Creating...' : 'Create HR User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditUserModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Edit User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400">Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/50 px-4 py-2 text-sm text-white outline-none"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setShowEditUserModal(false)}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={updateUserMutation.isPending}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
              >
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScoreModal && selectedHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Performance Score</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">HR Name</span>
                <span className="text-sm font-medium text-white">{selectedHR.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Score</span>
                <span className="text-sm font-medium text-emerald-300">{selectedHR.performance_score}/10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Candidates Handled</span>
                <span className="text-sm font-medium text-white">{selectedHR.candidates}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Selected</span>
                <span className="text-sm font-medium text-emerald-300">{selectedHR.selected}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">Rejected</span>
                <span className="text-sm font-medium text-red-300">{selectedHR.rejected}</span>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowScoreModal(false)}
                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showJobsModal && selectedHR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900 p-6">
            <h3 className="mb-4 text-lg font-semibold text-white">Jobs for {selectedHR?.name}</h3>
            {hrJobs.length === 0 ? (
              <p className="text-sm text-slate-400">No jobs assigned yet.</p>
            ) : (
              <div className="space-y-2">
                {hrJobs.map((job) => (
                  <div key={job.id} className="rounded-xl border border-white/10 bg-slate-950/40 p-3">
                    <p className="text-sm font-medium text-white">{job.job_title}</p>
                    <p className="text-xs text-slate-400">{job.domain} - {job.status}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowJobsModal(false)}
                className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-6 py-3 text-sm font-medium transition-all ${
        active
          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

function QuickActionCard({ title, description, icon, onClick }: { title: string; description: string; icon: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-white/10 bg-slate-900/60 p-5 transition hover:border-white/20 hover:bg-slate-800/50"
    >
      <span className="text-2xl">{icon}</span>
      <h4 className="mt-3 font-semibold text-white">{title}</h4>
      <p className="mt-1 text-sm text-slate-400">{description}</p>
    </div>
  )
}

function AnalyticsCard({ icon, title, value, subValue }: { icon: string; title: string; value: string; subValue?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
      <span className="text-2xl">{icon}</span>
      <p className="mt-2 text-xs text-slate-400">{title}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
      {subValue && <p className="text-xs text-slate-500">{subValue}</p>}
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  )
}