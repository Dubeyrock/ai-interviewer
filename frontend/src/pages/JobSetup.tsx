/**
 * JobSetup — Professional HR Job Setup Page
 * Features:
 * - JD Templates (IT + Non-IT + Custom)
 * - Skills Chips UI
 * - Live Job Preview Card
 * - AI Generate JD (via Anthropic API)
 * - Invite Link with WhatsApp + Email share
 * - Saved Jobs Table with Edit/Delete/Copy
 * - Active/Closed toggle
 * - Interview Configuration (difficulty, language, weights)
 * - Analytics per job
 */

import { useEffect, useMemo, useState, KeyboardEvent } from 'react'
import { api } from '../api/client'
import { toast } from 'react-hot-toast'

type JobType = 'it' | 'non_it' | 'other'
type JobStatus = 'active' | 'closed'

type Template = {
  title: string
  type: JobType
  experience: string
  skills: string[]
  description: string
}

const JD_TEMPLATES: Record<string, Template> = {
  'AI Engineer': {
    title: 'AI Engineer',
    type: 'it',
    experience: 'fresher',
    skills: ['Python', 'Machine Learning', 'LLM', 'RAG', 'FastAPI', 'LangChain'],
    description: `We are looking for a passionate AI Engineer to join our team.

Responsibilities:
• Build and deploy AI/ML models for production
• Develop RAG pipelines and LLM integrations
• Design REST APIs using FastAPI
• Collaborate with product teams on AI features

Requirements:
• Strong Python programming skills
• Experience with ML frameworks (PyTorch/TensorFlow)
• Knowledge of LLMs, RAG, and prompt engineering
• Familiarity with cloud platforms (AWS/GCP)`,
  },
  'React Developer': {
    title: 'React Developer',
    type: 'it',
    experience: 'fresher',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'REST APIs', 'Git'],
    description: `We are hiring a React Developer to build modern web applications.

Responsibilities:
• Develop responsive UI components in React + TypeScript
• Integrate REST APIs and manage state
• Optimize application performance
• Write clean, maintainable code

Requirements:
• Strong React.js and TypeScript skills
• Experience with Tailwind CSS or similar
• Understanding of component architecture
• Basic knowledge of Node.js`,
  },
  'Backend Developer': {
    title: 'Backend Developer',
    type: 'it',
    experience: 'fresher',
    skills: ['Python', 'FastAPI', 'SQL', 'REST APIs', 'Docker', 'Git'],
    description: `We are hiring a Backend Developer to build scalable APIs and services.

Responsibilities:
• Build REST APIs and backend services
• Work with databases and ORM tools
• Write clean, maintainable server-side code
• Collaborate with frontend and QA teams

Requirements:
• Strong Python or Node.js knowledge
• Experience with SQL databases
• Understanding of API design
• Familiarity with Docker and Git`,
  },
  'Data Scientist': {
    title: 'Data Scientist',
    type: 'it',
    experience: 'experienced',
    skills: ['Python', 'SQL', 'Machine Learning', 'Pandas', 'TensorFlow', 'Tableau'],
    description: `We need a Data Scientist to derive insights from complex datasets.

Responsibilities:
• Build predictive models and ML pipelines
• Perform EDA and feature engineering
• Present findings to stakeholders
• Deploy models to production

Requirements:
• Proficiency in Python, SQL, and ML libraries
• Experience with statistical analysis
• Knowledge of data visualization tools
• Strong communication skills`,
  },
  'ML Engineer': {
    title: 'ML Engineer',
    type: 'it',
    experience: 'experienced',
    skills: ['Python', 'Machine Learning', 'PyTorch', 'TensorFlow', 'MLOps', 'AWS'],
    description: `We are hiring an ML Engineer to build and deploy machine learning systems.

Responsibilities:
• Train and deploy ML models
• Build scalable pipelines for model inference
• Work with data scientists and engineers
• Monitor model performance in production

Requirements:
• Strong Python and ML framework knowledge
• Experience with MLOps and deployment
• Understanding of feature engineering
• Familiarity with AWS or cloud platforms`,
  },
  'DevOps Engineer': {
    title: 'DevOps Engineer',
    type: 'it',
    experience: 'experienced',
    skills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD', 'Linux', 'Terraform', 'Git'],
    description: `We need a DevOps Engineer to manage our cloud infrastructure.

Responsibilities:
• Design and maintain CI/CD pipelines
• Manage AWS infrastructure using Terraform
• Monitor system performance and reliability
• Implement security best practices

Requirements:
• Strong AWS and containerization skills
• Experience with Docker and Kubernetes
• Proficiency in Linux and shell scripting
• Knowledge of infrastructure-as-code`,
  },
  'Sales Executive': {
    title: 'Sales Executive',
    type: 'non_it',
    experience: 'fresher',
    skills: ['Communication', 'Negotiation', 'CRM', 'Lead Generation', 'Client Relations'],
    description: `We are looking for a dynamic Sales Executive to drive business growth.

Responsibilities:
• Generate and qualify leads through various channels
• Build and maintain client relationships
• Meet and exceed monthly sales targets
• Prepare sales reports and forecasts

Requirements:
• Excellent communication and interpersonal skills
• Strong negotiation and persuasion abilities
• Experience with CRM tools preferred
• Self-motivated with a results-driven mindset`,
  },
  'HR Recruiter': {
    title: 'HR Recruiter',
    type: 'non_it',
    experience: 'fresher',
    skills: ['Recruitment', 'Sourcing', 'Interviewing', 'HRMS', 'Communication', 'LinkedIn'],
    description: `We are hiring an HR Recruiter to manage end-to-end recruitment.

Responsibilities:
• Source candidates through job portals and LinkedIn
• Screen resumes and conduct initial interviews
• Coordinate with hiring managers
• Maintain candidate database and reports

Requirements:
• Excellent communication and organizational skills
• Knowledge of recruitment tools and job portals
• Ability to manage multiple positions simultaneously
• Strong attention to detail`,
  },
  'Business Analyst': {
    title: 'Business Analyst',
    type: 'non_it',
    experience: 'fresher',
    skills: ['Requirements Gathering', 'Documentation', 'Excel', 'Communication', 'Stakeholder Management'],
    description: `We are hiring a Business Analyst to work with stakeholders and document business requirements.

Responsibilities:
• Gather and analyze business requirements
• Create documentation and process flows
• Coordinate with internal teams and clients
• Support reporting and analysis activities

Requirements:
• Strong communication and documentation skills
• Ability to analyze business processes
• Good Excel and reporting knowledge
• Stakeholder coordination ability`,
  },

  'Other / Custom Role': {
    title: '',
    type: 'other',
    experience: 'fresher',
    skills: [],
    description: '',

  }
}

interface SavedJob {
  job_id: string
  title: string
  type: JobType | string
  description: string
  skills: string[]
  experience_level: string
  candidate_email: string | null
  status: JobStatus
  difficulty: string
  language: string[]
  technical_weight: number
  behavioral_weight: number
  created_at: string
  candidates_count?: number
  invite_link?: string
}

function normalizeJob(job: any): SavedJob {
  const rawLanguage = job?.language ?? job?.interview_language ?? ['english']
  const language =
    Array.isArray(rawLanguage)
      ? rawLanguage
      : typeof rawLanguage === 'string'
        ? rawLanguage
          .split('+')
          .map((x: string) => x.trim().toLowerCase())
          .filter(Boolean)
        : ['english']

  return {
    job_id: String(job?.job_id ?? job?.id ?? ''),
    title: job?.title ?? job?.job_title ?? '',
    type: job?.type ?? job?.domain ?? 'other',
    description: job?.description ?? job?.job_description ?? '',
    skills: job?.skills ?? job?.required_skills ?? [],
    experience_level: job?.experience_level ?? 'fresher',
    candidate_email: job?.candidate_email ?? job?.assign_candidate_email ?? null,
    status: (job?.status ?? 'active') as JobStatus,
    difficulty: job?.difficulty ?? job?.interview_difficulty ?? 'medium',
    language,
    technical_weight: job?.technical_weight ?? 70,
    behavioral_weight: job?.behavioral_weight ?? 30,
    created_at: job?.created_at ?? '',
    candidates_count: job?.candidates_count ?? 0,
    invite_link: job?.invite_link,
  }
}

export default function JobSetup() {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<JobType>('it')
  const [description, setDescription] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [skillChips, setSkillChips] = useState<string[]>([])
  const [experience, setExperience] = useState('fresher')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [status, setStatus] = useState<JobStatus>('active')
  const [difficulty, setDifficulty] = useState('medium')
  const [language, setLanguage] = useState<string[]>(['english'])
  const [techWeight, setTechWeight] = useState(70)
  const [savedJobId, setSavedJobId] = useState<string | null>(null)
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'form' | 'jobs'>('form')
  const [search, setSearch] = useState('')

  const behavioralWeight = 100 - techWeight

  const inviteLink = useMemo(() => {
    if (!savedJobId) return ''
    return `${window.location.origin}/register?jobId=${savedJobId}&source=hr`
  }, [savedJobId])

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return savedJobs
    return savedJobs.filter((job) => {
      return (
        job.title.toLowerCase().includes(q) ||
        job.type.toLowerCase().includes(q) ||
        job.experience_level.toLowerCase().includes(q) ||
        (job.skills || []).join(', ').toLowerCase().includes(q)
      )
    })
  }, [savedJobs, search])

  useEffect(() => {
    fetchJobs()
  }, [])

  const fetchJobs = async () => {
    try {
      const res = await api.get('/hr/jobs')
      const jobs = (res.data.jobs || []).map(normalizeJob)
      setSavedJobs(jobs)
    } catch {
      // optional list
    }
  }

  const applyTemplate = (templateName: string) => {
    const t = JD_TEMPLATES[templateName]
    if (!t) return
    setTitle(t.title)
    setType(t.type)
    setExperience(t.experience)
    setSkillChips(t.skills)
    setDescription(t.description)
    toast.success(`Template "${templateName}" applied!`)
  }

  const addSkillChip = (value: string) => {
    const trimmed = value.trim()
    if (trimmed && !skillChips.includes(trimmed)) {
      setSkillChips((prev) => [...prev, trimmed])
    }
    setSkillInput('')
  }

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addSkillChip(skillInput)
    }
    if (e.key === 'Backspace' && !skillInput && skillChips.length) {
      setSkillChips((prev) => prev.slice(0, -1))
    }
  }

  const removeChip = (chip: string) => {
    setSkillChips((prev) => prev.filter((s) => s !== chip))
  }

  const generateJD = async () => {
    if (!title) {
      toast.error('Enter Job Title first')
      return
    }

    setAiGenerating(true)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: `Generate a professional job description for:
Role: ${title}
Domain: ${type === 'it' ? 'IT/Technical' : type === 'non_it' ? 'Non-IT/Business' : 'Other/Custom'}
Experience: ${experience}
${skillChips.length ? `Skills: ${skillChips.join(', ')}` : ''}

Return ONLY the job description text with sections:
- About the Role (2-3 lines)
- Responsibilities (4-5 bullet points)
- Requirements (4-5 bullet points)

Keep it concise, professional, and under 200 words.`,
            },
          ],
        }),
      })

      const data = await response.json()
      const text = data.content?.[0]?.text || ''
      if (text) {
        setDescription(text)
        toast.success('JD generated by AI!')
      } else {
        toast.error('AI generation returned empty text')
      }
    } catch {
      toast.error('AI generation failed. Write JD manually.')
    } finally {
      setAiGenerating(false)
    }
  }

  // ✅ NAYA — capitalized, backend ke saath match
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const getPayload = () => ({
    job_title: title.trim(),
    domain: type,
    job_description: description.trim(),
    required_skills: skillChips,
    experience_level: cap(experience),           // "fresher" → "Fresher"
    assign_candidate_email: candidateEmail.trim() || null,
    status: cap(status),               // "active" → "Active"
    interview_difficulty: cap(difficulty),           // "medium" → "Medium"
    interview_language: language.map(cap).join(' + '), // "english" → "English"
    technical_weight: techWeight,
    behavioral_weight: behavioralWeight,
  })

  const getJobIdFromResponse = (data: any): string | null => {
    const id = data?.job?.job_id ?? data?.job?.id ?? data?.job_id ?? data?.id
    return id ? String(id) : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !description) {
      toast.error('Title and Description required')
      return
    }

    setLoading(true)
    try {
      const payload = getPayload()

      let res: any
      if (editingId) {
        res = await api.put(`/hr/jobs/${editingId}`, payload)
        toast.success('Job updated!')
      } else {
        res = await api.post('/hr/jobs', payload)
        toast.success('Job created!')
      }

      const newId = getJobIdFromResponse(res.data) || editingId
      if (newId) setSavedJobId(newId)

      setEditingId(null)
      await fetchJobs()
      setActiveTab('form')
    } catch {
      toast.error('Failed to save job')
    } finally {
      setLoading(false)
    }
  }

  const loadJob = (job: SavedJob) => {
    setTitle(job.title)
    setType((job.type as JobType) || 'other')
    setDescription(job.description)
    setSkillChips(job.skills || [])
    setExperience(job.experience_level)
    setCandidateEmail(job.candidate_email || '')
    setStatus(job.status)
    setDifficulty(job.difficulty || 'medium')
    setLanguage(job.language?.length ? job.language : ['english'])
    setTechWeight(job.technical_weight || 70)
    setEditingId(job.job_id)
    setSavedJobId(job.job_id)
    setActiveTab('form')
    window.scrollTo({ top: 0, behavior: 'smooth' })
    toast('Job loaded for editing', { icon: '✏️' })
  }

  const deleteJob = async (jobId: string) => {
    if (!confirm('Delete this job?')) return
    try {
      await api.delete(`/hr/jobs/${jobId}`)
      toast.success('Job deleted')
      setSavedJobs((prev) => prev.filter((job) => job.job_id !== jobId))
      if (savedJobId === jobId) setSavedJobId(null)
      await fetchJobs()
    } catch {
      toast.error('Delete failed')
    }
  }

  const copyLink = async (jobId: string) => {
    const link = `${window.location.origin}/register?jobId=${jobId}&source=hr`
    await navigator.clipboard.writeText(link)
    toast.success('Link copied!')
  }

  const shareWhatsApp = () => {
    const text = `You have been invited for an interview!

Role: ${title}
Register here: ${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
  }

  const shareEmail = () => {
    const subject = `Interview Invitation — ${title}`
    const body = `Dear Candidate,\n\nYou have been invited to attend an AI-powered interview for the role of ${title}.\n\nJob Description:\n${description}\n\nRequired Skills:\n${(skillChips || []).join(', ')}\n\nPlease register here: ${inviteLink}\n\nBest regards,\nHR Team`
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  const resetForm = () => {
    setTitle('')
    setType('it')
    setDescription('')
    setSkillChips([])
    setSkillInput('')
    setExperience('fresher')
    setCandidateEmail('')
    setStatus('active')
    setDifficulty('medium')
    setLanguage(['english'])
    setTechWeight(70)
    setSavedJobId(null)
    setEditingId(null)
  }

  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'

  const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5'
  const sectionCls = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5'

  const isCustomRole = type === 'other'

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Job Setup</h1>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            Create job postings, preview interview setup, and share candidate invite links.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('form')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'form'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            + New Job
          </button>
          <button
            onClick={() => {
              setActiveTab('jobs')
              fetchJobs()
            }}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeTab === 'jobs'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
          >
            Saved Jobs ({savedJobs.length})
          </button>
        </div>
      </div>

      {activeTab === 'form' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5">
            <div className={sectionCls}>
              <p className={labelCls}>Quick Templates</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(JD_TEMPLATES).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:text-indigo-400"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${sectionCls} space-y-4`}>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Basic Info
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>
                    {isCustomRole ? 'Custom Job Title *' : 'Job Title *'}
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isCustomRole ? 'e.g. AI Product Manager' : 'e.g. React Developer'}
                    className={inputCls}
                    required
                  />
                </div>

                <div>
                  <label className={labelCls}>Domain *</label>
                  <select value={type} onChange={(e) => setType(e.target.value as JobType)} className={inputCls}>
                    <option value="it">🟢 IT / Technical</option>
                    <option value="non_it">🟠 Non-IT / Business</option>
                    <option value="other">⚪ Other / Custom</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Experience Level</label>
                  <select value={experience} onChange={(e) => setExperience(e.target.value)} className={inputCls}>
                    <option value="fresher">Fresher (0-1 year)</option>
                    <option value="junior">Junior (1-3 years)</option>
                    <option value="experienced">Experienced (3+ years)</option>
                    <option value="senior">Senior (5+ years)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Status</label>
                  <div className="mt-1 flex gap-2">
                    {(['active', 'closed'] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStatus(s)}
                        className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition ${status === s
                          ? s === 'active'
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-red-500 bg-red-500 text-white'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950'
                          }`}
                      >
                        {s === 'active' ? '🟢 Active' : '🔴 Closed'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>Required Skills</label>
              <div className="mb-2 flex min-h-[36px] flex-wrap gap-2">
                {skillChips.map((chip) => (
                  <span
                    key={chip}
                    className="flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
                  >
                    {chip}
                    <button
                      type="button"
                      onClick={() => removeChip(chip)}
                      className="ml-1 text-indigo-400 transition hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                onBlur={() => skillInput && addSkillChip(skillInput)}
                placeholder="Type skill and press Enter or comma..."
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">Press Enter or comma to add each skill</p>
            </div>

            <div className={sectionCls}>
              <div className="mb-2 flex items-center justify-between">
                <label className={labelCls}>Job Description *</label>
                <button
                  type="button"
                  onClick={generateJD}
                  disabled={aiGenerating}
                  className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700 disabled:opacity-60"
                >
                  {aiGenerating ? '⚙️ Generating...' : '✨ Generate with AI'}
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={8}
                placeholder="Paste or write job description here, or click 'Generate with AI'..."
                className={inputCls}
                required
              />
              <p className="mt-1 text-right text-xs text-slate-400">{description.length} chars</p>
            </div>

            <div className={`${sectionCls} space-y-4`}>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Interview Configuration
              </p>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className={labelCls}>Difficulty</label>
                  <div className="flex gap-1">
                    {['easy', 'medium', 'hard'].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold capitalize transition ${difficulty === d
                          ? d === 'easy'
                            ? 'border-green-500 bg-green-500 text-white'
                            : d === 'medium'
                              ? 'border-amber-500 bg-amber-500 text-white'
                              : 'border-red-500 bg-red-500 text-white'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950'
                          }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Language</label>
                  <div className="flex gap-1">
                    {['english', 'hindi'].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() =>
                          setLanguage(language.includes(l) ? language.filter((x) => x !== l) : [...language, l])
                        }
                        className={`flex-1 rounded-xl border py-1.5 text-xs font-semibold capitalize transition ${language.includes(l)
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-950'
                          }`}
                      >
                        {l === 'english' ? '🇬🇧 EN' : '🇮🇳 HI'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Questions</label>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    10 Questions
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 flex justify-between">
                  <label className={labelCls}>Technical Weight</label>
                  <span className="text-sm font-bold text-indigo-600">
                    {techWeight}% Technical / {behavioralWeight}% Behavioral
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={techWeight}
                  onChange={(e) => setTechWeight(Number(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>

            <div className={sectionCls}>
              <label className={labelCls}>Assign Candidate Email (Optional)</label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                placeholder="candidate@example.com"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">
                This candidate will auto-load this job after registration.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-2xl bg-indigo-600 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {loading ? 'Saving...' : editingId ? '✏️ Update Job' : '💾 Save Job'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-800 dark:from-indigo-950/30 dark:to-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                  Live Preview
                </p>
                {savedJobId && (
                  <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                    Job ID: #{savedJobId}
                  </span>
                )}
              </div>

              <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">
                {title || <span className="text-base font-normal text-slate-400">Job Title</span>}
              </h2>

              <div className="mb-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${type === 'it'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : type === 'non_it'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                >
                  {type === 'it' ? '🟢 IT' : type === 'non_it' ? '🟠 Non-IT' : '⚪ Other'}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold capitalize text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  {experience}
                </span>
                <span
                  className={`rounded-full px-3 py-0.5 text-xs font-semibold ${status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}
                >
                  {status === 'active' ? '🟢 Active' : '🔴 Closed'}
                </span>
              </div>

              {skillChips.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {skillChips.map((s) => (
                    <span
                      key={s}
                      className="rounded-md border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-3 space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <div className="flex justify-between">
                  <span>Difficulty</span>
                  <span className="font-semibold capitalize">{difficulty}</span>
                </div>
                <div className="flex justify-between">
                  <span>Language</span>
                  <span className="font-semibold capitalize">{language.join(' + ')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical</span>
                  <span className="font-semibold">{techWeight}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Behavioral</span>
                  <span className="font-semibold">{behavioralWeight}%</span>
                </div>
              </div>
            </div>

            {savedJobId && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  ✅ Job Saved — Invite Candidate
                </p>

                <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-1 text-xs text-slate-400">Invite Link</p>
                  <p className="break-all font-mono text-xs text-slate-700 dark:text-slate-300">{inviteLink}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(inviteLink)
                      toast.success('Link copied!')
                    }}
                    className="rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={shareWhatsApp}
                    className="rounded-xl bg-green-500 py-2 text-xs font-bold text-white transition hover:bg-green-600"
                  >
                    💬 WhatsApp
                  </button>
                  <button
                    onClick={shareEmail}
                    className="rounded-xl bg-blue-500 py-2 text-xs font-bold text-white transition hover:bg-blue-600"
                  >
                    📧 Email
                  </button>
                </div>
              </div>
            )}

            {description && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-400">JD Preview</p>
                <p className="line-clamp-10 whitespace-pre-line text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {description}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved jobs..."
              className={inputCls}
            />
            <button
              onClick={fetchJobs}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Refresh
            </button>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
              <p className="text-sm text-slate-400">No jobs created yet.</p>
              <button
                onClick={() => setActiveTab('form')}
                className="mt-3 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                + Create First Job
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50">
                  <tr>
                    {['Job ID', 'Role', 'Domain', 'Experience', 'Skills', 'Status', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filteredJobs.map((job) => (
                    <tr key={job.job_id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">#{job.job_id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{job.title}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${job.type === 'it'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : job.type === 'non_it'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}
                        >
                          {job.type === 'it' ? 'IT' : job.type === 'non_it' ? 'Non-IT' : 'Other'}
                        </span>
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-400">
                        {job.experience_level}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                        {(job.skills || []).join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${job.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                            }`}
                        >
                          {job.status === 'active' ? '🟢 Active' : '🔴 Closed'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => loadJob(job)}
                            className="rounded-lg bg-indigo-100 px-2 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => copyLink(job.job_id)}
                            className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300"
                          >
                            Copy Link
                          </button>
                          <button
                            onClick={() => deleteJob(job.job_id)}
                            className="rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400"
                          >
                            Delete
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
    </div>
  )
}