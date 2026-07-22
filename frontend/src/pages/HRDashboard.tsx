import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, getApiOrigin } from '../api/client'
import CandidateTable from '../components/hr/CandidateTable'
import ScoreCard from '../components/hr/ScoreCard'
import ReportDownload from '../components/hr/ReportDownload'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Search, Filter, LayoutDashboard } from 'lucide-react'

type CandidateRow = {
  session_id: string
  candidate_id?: string
  candidate_name: string
  domain: string
  job_role?: string
  total_score: number
  fit_score?: number
  answers_count: number
  status: string
  recommendation?: string
  has_resume?: boolean
}

const PIE_COLORS = ['#10b981', '#f43f5e', '#6366f1', '#f59e0b']
const TAB_OPTIONS = ['All', 'Selected', 'Rejected'] as const
type TabType = typeof TAB_OPTIONS[number]

export default function HRDashboard() {
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [reportMessage, setReportMessage] = useState('')
  const [generating, setGenerating] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoModalTitle, setVideoModalTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [loadingVideo, setLoadingVideo] = useState(false)
  const [videoError, setVideoError] = useState('')

  const dashboardQuery = useQuery({
    queryKey: ['hr-dashboard'],
    queryFn: async () => (await api.get('/hr/dashboard')).data,
  })

  const candidatesQuery = useQuery({
    queryKey: ['hr-candidates'],
    queryFn: async () => (await api.get('/hr/candidates')).data,
  })

  useEffect(() => {
    const first = candidatesQuery.data?.candidates?.[0]
    if (first?.session_id && !selectedSessionId) {
      setSelectedSessionId(first.session_id)
    }
  }, [candidatesQuery.data, selectedSessionId])

  const resolveVideoUrl = (data: any) => {
    if (data?.video_url) return String(data.video_url)
    if (data?.video_id) return `${getApiOrigin()}/api/video/${data.video_id}/download`
    return ''
  }

  const openVideoModal = async (candidate: CandidateRow) => {
    const sessionId = candidate.session_id
    if (!sessionId) {
      setReportMessage('No interview session found for this candidate.')
      return
    }

    setVideoModalTitle(candidate.candidate_name || 'Interview Video')
    setVideoModalOpen(true)
    setLoadingVideo(true)
    setVideoError('')
    setVideoUrl('')

    try {
      const response = await api.get(`/video/session/${sessionId}`)
      const url = resolveVideoUrl(response.data)

      if (!url) {
        setVideoError('Video not found for this session.')
        return
      }

      setVideoUrl(url)
    } catch (error: any) {
      setVideoError(error?.response?.data?.detail || 'Could not load video.')
    } finally {
      setLoadingVideo(false)
    }
  }

  const closeVideoModal = () => {
    setVideoModalOpen(false)
    setVideoModalTitle('')
    setVideoUrl('')
    setVideoError('')
    setLoadingVideo(false)
  }

  const handleGenerate = async () => {
    const sessionId = selectedSessionId || candidatesQuery.data?.candidates?.[0]?.session_id
    if (!sessionId) {
      setReportMessage('No interview session found for report generation.')
      return
    }

    setGenerating(true)
    setReportMessage('')
    try {
      const { data } = await api.post('/report/generate', { session_id: sessionId })
      window.open(`${getApiOrigin()}/api/report/${data.report_id}/download`, '_blank')
      setReportMessage('PDF report generated successfully.')
    } catch (error: any) {
      setReportMessage(error?.response?.data?.detail || 'Could not generate PDF report.')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeleteCandidate = async (candidateId: string) => {
    const ok = window.confirm('Delete this candidate profile and interview session?')
    if (!ok) return

    setReportMessage('')
    try {
      await api.delete(`/candidates/${candidateId}`)
      setSelectedSessionId('')
      await Promise.all([dashboardQuery.refetch(), candidatesQuery.refetch()])
      setReportMessage('Candidate profile deleted.')
    } catch (error: any) {
      setReportMessage(error?.response?.data?.detail || 'Could not delete candidate.')
    }
  }

  const allCandidates: CandidateRow[] = candidatesQuery.data?.candidates || []
  const selected = allCandidates.filter((c) => c.recommendation === 'SELECTED')
  const rejected = allCandidates.filter((c) => c.recommendation === 'REJECTED')

  // Get unique job roles for filter
  const uniqueRoles = [...new Set(allCandidates.map((c) => c.job_role).filter(Boolean))] as string[]

  // Apply filters
  let filteredCandidates = allCandidates
  if (activeTab === 'Selected') filteredCandidates = selected
  if (activeTab === 'Rejected') filteredCandidates = rejected

  if (searchQuery.trim()) {
    filteredCandidates = filteredCandidates.filter((c) =>
      c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }

  if (roleFilter) {
    filteredCandidates = filteredCandidates.filter((c) => c.job_role === roleFilter)
  }

  // Chart Data — Score Distribution
  const scoreRanges = [
    { range: '0-20', count: 0 },
    { range: '21-40', count: 0 },
    { range: '41-60', count: 0 },
    { range: '61-80', count: 0 },
    { range: '81-100', count: 0 },
  ]
  allCandidates.forEach((c) => {
    const s = c.total_score
    if (s <= 20) scoreRanges[0].count++
    else if (s <= 40) scoreRanges[1].count++
    else if (s <= 60) scoreRanges[2].count++
    else if (s <= 80) scoreRanges[3].count++
    else scoreRanges[4].count++
  })

  // Pie chart data — Status Distribution
  const pieData = [
    { name: 'Selected', value: selected.length },
    { name: 'Rejected', value: rejected.length },
    { name: 'Pending', value: allCandidates.length - selected.length - rejected.length },
  ].filter((d) => d.value > 0)

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* ── Header ── */}
      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              HR Dashboard
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage candidates, review scores, and generate reports
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
              disabled={!allCandidates.length}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none disabled:cursor-not-allowed disabled:opacity-60 focus:border-emerald-500"
            >
              {allCandidates.length === 0 && <option value="">No candidates yet</option>}
              {allCandidates.map((c) => (
                <option key={c.session_id || c.candidate_id} value={c.session_id}>
                  {c.candidate_name} - {c.recommendation}
                </option>
              ))}
            </select>
            <ReportDownload onClick={handleGenerate} disabled={generating || !allCandidates.length} />
          </div>
          {reportMessage && (
            <p className={`text-sm ${reportMessage.includes('success') ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {reportMessage}
            </p>
          )}
        </div>
      </div>

      {/* ── Score Cards ── */}
      <div className="mb-8 grid gap-4 grid-cols-2 xl:grid-cols-4">
        <ScoreCard title="Candidates" score={dashboardQuery.data?.candidate_count ?? 0} />
        <ScoreCard title="Average Fit" score={dashboardQuery.data?.average_score ?? 0} />
        <ScoreCard title="Selected" score={selected.length} />
        <ScoreCard title="Rejected" score={rejected.length} />
      </div>

      {/* ── Charts Section ── */}
      {allCandidates.length > 0 && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {/* Bar Chart — Score Distribution */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Score Distribution
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scoreRanges}>
                <XAxis dataKey="range" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#f1f5f9',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart — Status */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Status Distribution
            </h3>
            <div className="flex items-center justify-center gap-8">
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '12px',
                      color: '#f1f5f9',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {pieData.map((entry, idx) => (
                  <div key={entry.name} className="flex items-center gap-3">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                      {entry.name}: <span className="font-semibold text-slate-900 dark:text-white">{entry.value}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters & Tabs ── */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800/50 p-1">
          {TAB_OPTIONS.map((tab) => {
            const count = tab === 'All' ? allCandidates.length : tab === 'Selected' ? selected.length : rejected.length
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab} <span className="ml-1 text-xs opacity-70">({count})</span>
              </button>
            )
          })}
        </div>

        {/* Search & Role Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-500 w-56"
            />
          </div>
          {uniqueRoles.length > 1 && (
            <div className="relative flex items-center">
              <Filter className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-emerald-500 appearance-none"
              >
                <option value="">All Roles</option>
                {uniqueRoles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <CandidateTable
        candidates={filteredCandidates}
        loading={candidatesQuery.isLoading}
        onDelete={handleDeleteCandidate}
        onViewVideo={openVideoModal}
      />

      {/* ── Video Modal ── */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                  Interview Video
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {videoModalTitle}
                </p>
              </div>

              <button
                onClick={closeVideoModal}
                className="rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>

            {loadingVideo && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading video...</p>
              </div>
            )}

            {!loadingVideo && videoError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800/30 p-6 text-red-700 dark:text-red-400">
                {videoError}
              </div>
            )}

            {!loadingVideo && videoUrl && (
              <video
                controls
                autoPlay
                src={videoUrl}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-950"
              >
                Your browser does not support the video tag.
              </video>
            )}

            {!loadingVideo && !videoError && !videoUrl && (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 p-6">
                <p className="text-sm text-slate-600 dark:text-slate-400">No video available.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}