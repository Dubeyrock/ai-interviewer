import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useInterviewStore } from '../store/interviewStore'
import femaleAvatar from '../assets/female-ai_frame.png'
import maleAvatar from '../assets/male-ai_frame.png'

const domains = ['IT', 'Non-IT', 'Marketing', 'Sales', 'HR', 'Finance', 'Data Science', 'DevOps', 'Cybersecurity', 'UI/UX', 'Legal', 'Operations', 'Research', 'Others']
const jobRoles = [
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'ML Engineer',
  'Data Scientist',
  'DevOps Engineer',
  'Cloud Engineer',
  'Operations Executive',
  'Business Analyst',
  'Customer Support',
  'Project Coordinator',
  'SEO Specialist',
  'Performance Marketer',
  'Content Strategist',
  'Brand Executive',
  'Sales Executive',
  'Account Executive',
  'Business Development Representative',
  'HR Executive',
  'Talent Acquisition Specialist',
  'HR Generalist',
  'Finance Analyst',
  'Accounts Executive',
  'MIS Executive',
  'Security Analyst',
  'SOC Analyst',
  'GRC Analyst',
  'UI Designer',
  'UX Designer',
  'Product Designer',
  'Others'
];

type PreviewLanguage = 'english' | 'hindi'
type PreviewGender = 'female' | 'male'

export default function CandidateRegistration() {
  const isHR = false; // Set to true for HR view (e.g., separate route or admin login)

  const setProfile = useInterviewStore((s) => s.setProfile)
  const setCurrentQuestion = useInterviewStore((s) => s.setCurrentQuestion)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [resume, setResume] = useState<File | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<'female' | 'male'>('female')
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi'>('english')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [expYears, setExpYears] = useState('');
  const [expMonths, setExpMonths] = useState('');
  const [jobId, setJobId] = useState(searchParams.get('jobId') || '');
  const [loadedJobTitle, setLoadedJobTitle] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    experience: '',
    current_company: '',
    current_salary: '',
    expected_salary: '',
    location: '',
    domain: 'IT',
    job_role: 'Frontend Developer',
    skills: '',
    linkedin: '',
    github: '',
    job_description: '',
    qualification: 'IT',
    notice_period: '',
    education: '',
    hr_message: '',
  })

  const handleChange = (key: string, value: string) => {
    setForm((prev) => {
      return { ...prev, [key]: value }
    })
  }

  const loadJob = async (id = jobId) => {
    const trimmedJobId = id.trim()
    if (!trimmedJobId) return
    setMessage('')
    try {
      const { data } = await api.get(`/hr/jobs/${trimmedJobId}`)
      const job = data.job || data // Handle both direct job object and nested response
      
      let parsedSkills = job.required_skills || []
      if (typeof parsedSkills === 'string') {
        try {
          parsedSkills = JSON.parse(parsedSkills)
        } catch {
          parsedSkills = parsedSkills.split(',').map((s: string) => s.trim())
        }
      }
      
      const domain = job.domain === 'it' ? 'IT' : job.domain === 'non_it' ? 'Non-IT' : 'Non-IT'
      
      setForm((prev) => ({
        ...prev,
        domain: domain,
        job_role: job.job_title || prev.job_role,
        skills: Array.isArray(parsedSkills) ? parsedSkills.join(', ') : parsedSkills || prev.skills,
        job_description: job.job_description || prev.job_description,
      }))
      setLoadedJobTitle(job.job_title || '')
      setMessage(`Loaded job ${job.id}: ${job.job_title}`)
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Could not load this Job ID.')
    }
  }

  useEffect(() => {
    const inviteJobId = searchParams.get('jobId')
    if (!inviteJobId) return
    setJobId(inviteJobId)
    loadJob(inviteJobId)
  }, [searchParams])

  useEffect(() => {
    return () => window.speechSynthesis?.cancel()
  }, [])

  const testApi = async () => {
    setLoading(true)
    setMessage('')
    try {
      const { data } = await api.get('/health')
      setMessage(`API reachable — status: ${data?.status || 'ok'}`)
    } catch (err: any) {
      setMessage(`API test failed: ${err?.message || JSON.stringify(err)}`)
    } finally {
      setLoading(false)
    }
  }

  const selectBrowserVoice = (language: PreviewLanguage, gender: PreviewGender): SpeechSynthesisVoice | undefined => {
    const voices = window.speechSynthesis.getVoices()
    const languageMatcher = language === 'hindi' ? /^hi(-|$)/i : /^en(-|$)/i
    const genderMatcher = gender === 'female' ? /female|woman|girl|zira|susan|heera|kirti|deepa/i : /male|man|boy|david|ravi/i
    const englishMatcher = /^en(-|$)/i

    const languageVoices = voices.filter((voice) => languageMatcher.test(voice.lang || ''))
    const genderVoices = voices.filter((voice) => genderMatcher.test(voice.name || ''))

    if (gender === 'male') {
      return languageVoices.find((voice) => genderMatcher.test(voice.name || '')) ||
        genderVoices[0] ||
        languageVoices[0] ||
        voices.find((voice) => englishMatcher.test(voice.lang || ''))
    }

    return languageVoices.find((voice) => genderMatcher.test(voice.name || '')) ||
      languageVoices[0] ||
      genderVoices[0] ||
      voices.find((voice) => englishMatcher.test(voice.lang || ''))
  }

  const decodeBase64Audio = (audio: string) => {
    const binary = atob(audio)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  const playBackendPreview = async (gender: PreviewGender, language: PreviewLanguage, text: string) => {
    try {
      const { data } = await api.post('/tts/synthesize', {
        text,
        gender,
        language,
      })

      if (!data?.audio) {
        return false
      }

      const blob = new Blob([decodeBase64Audio(data.audio)], { type: data.mime_type || 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.onended = () => URL.revokeObjectURL(url)
      audio.onerror = () => URL.revokeObjectURL(url)
      await audio.play()
      return true
    } catch (error) {
      console.warn('[Voice Preview] Backend TTS failed:', error)
      return false
    }
  }

  const previewRecruiterVoice = (gender: PreviewGender, language: PreviewLanguage) => {
    const text =
      language === 'hindi'
        ? 'नमस्ते, इंटरव्यू में आपका स्वागत है। मैं आपकी ए आई एच आर रिक्रूटर हूँ।'
        : 'Welcome to the interview. I am your AI HR recruiter.'

    const speakWithBrowserVoice = () => {
      if (!('speechSynthesis' in window)) {
        setMessage('Voice preview is not supported in this browser.')
        return
      }

      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = language === 'hindi' ? 'hi-IN' : 'en-IN'
      utterance.rate = language === 'hindi' ? 0.85 : 0.95
      utterance.pitch = gender === 'female' ? 1.12 : 0.82

      const preferredVoice = selectBrowserVoice(language, gender)

      if (preferredVoice) utterance.voice = preferredVoice
      setTimeout(() => {
        console.log('[Voice Preview] Speaking with voice:', preferredVoice?.name || 'default', 'lang:', utterance.lang)
      }, 0)
      setSelectedAvatar(gender)
      setSelectedLanguage(language)
      setMessage(`${gender === 'female' ? 'HR Priya' : 'HR Amit'} ${language === 'hindi' ? 'Hindi' : 'English'} voice preview playing from browser voices.`)
      window.speechSynthesis.speak(utterance)
    }

    playBackendPreview(gender, language, text)
      .then((playedFromBackend) => {
        if (playedFromBackend) {
          setSelectedAvatar(gender)
          setSelectedLanguage(language)
          setMessage(`${gender === 'female' ? 'HR Priya' : 'HR Amit'} ${language === 'hindi' ? 'Hindi' : 'English'} voice preview playing from backend TTS.`)
        } else {
          speakWithBrowserVoice()
        }
      })
      .catch(() => speakWithBrowserVoice())
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k !== 'experience') fd.append(k, v as any);
      });
      fd.append('experience', `${expYears} years ${expMonths} months`);
      fd.append('gender', selectedAvatar);
      fd.append('language', selectedLanguage);
      if (resume) fd.append('resume', resume);
      if (jobId.trim()) fd.append('job_id', jobId.trim());

      const { data } = await api.post('/candidates/register', fd)

      localStorage.setItem('selected_avatar_gender', selectedAvatar)
      localStorage.setItem('selected_language', selectedLanguage)

setProfile({
         candidateId: data.candidate_id,
         sessionId: data.session_id,
         name: form.full_name,
         email: form.email,
         domain: form.domain,
         jobRole: form.job_role,
         fitScore: data.fit_score,
         recommendation: data.recommendation,
         avatarGender: selectedAvatar,
         language: selectedLanguage === 'hindi' ? 'hi' : 'en',
         gender: selectedAvatar,
       })
      setCurrentQuestion(data.current_question)
      setMessage(`Candidate ${data.recommendation.toLowerCase()} with fit score ${data.fit_score}.`)
      navigate(`/interview?candidateId=${data.candidate_id}&sessionId=${data.session_id}`)
    } catch (error: any) {
      console.error('[CandidateRegistration] submit error', error)
      const detail = error?.response?.data?.detail
      if (Array.isArray(detail)) {
        setMessage(detail.map((d: any) => d.msg || JSON.stringify(d)).join(', '))
      } else if (typeof detail === 'string') {
        setMessage(detail)
      } else if (detail && typeof detail === 'object') {
        setMessage(JSON.stringify(detail))
      } else if (error?.response) {
        // Response present but no structured detail
        setMessage(`Server responded with status ${error.response.status}: ${JSON.stringify(error.response.data)}`)
      } else if (error?.request) {
        // Request made but no response
        setMessage(`No response from API (${api.defaults.baseURL}). Network or CORS issue: ${error.message}`)
      } else {
        // Something else
        setMessage(`Request failed: ${error?.message || JSON.stringify(error)}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-emerald-400'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
          Candidate Intake
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-slate-100">
          Register candidate and auto-start interview
        </h1>
        <p className="mt-2 max-w-3xl text-slate-600 dark:text-slate-400">
          Candidate details, resume, domain, and job role are used to calculate fit score and generate dynamic interview questions.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="grid gap-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm lg:grid-cols-2"
      >
        {[
          ['full_name', 'Full Name'],
          ['email', 'Email'],
        ].map(([key, label]) => (
          <label key={key} className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <input
              required={true}
              value={(form as any)[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className={inputClass}
              placeholder={label}
            />
          </label>
        ))}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Phone</span>
          <input
            type="tel"
            placeholder="+1 555-1234"
            pattern="^\+?[0-9]{1,4}[ ]?[0-9]{6,14}$"
            required
            value={form.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Job ID from HR</span>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              className={inputClass}
              placeholder="Paste Job ID, e.g. 1"
            />
            <button
              type="button"
              onClick={() => loadJob()}
              className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
            >
              Load Job
            </button>
          </div>
        </label>
        {loadedJobTitle && (
          <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-800 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-slate-200">
            <p className="font-semibold text-emerald-700 dark:text-emerald-300">
              Loaded Job: {loadedJobTitle} {jobId ? `(ID: ${jobId})` : ''}
            </p>
            <p className="mt-2">
              <span className="font-medium">Domain:</span> {form.domain} · <span className="font-medium">Skills:</span> {form.skills || 'Not specified'}
            </p>
            {form.job_description && (
              <p className="mt-2 line-clamp-3">
                <span className="font-medium">Job Description:</span> {form.job_description}
              </p>
            )}
          </div>
        )}
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience (Years)</span>
          <input
            type="number"
            min="0"
            placeholder="Years"
            value={expYears}
            onChange={(e) => setExpYears(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Experience (Months)</span>
          <input
            type="number"
            min="0"
            max="11"
            placeholder="Months"
            value={expMonths}
            onChange={(e) => setExpMonths(e.target.value)}
            className={inputClass}
          />
        </label>

        {[
          ['current_company', 'Current Company'],
          ['current_salary', 'Current Salary'],
          ['expected_salary', 'Expected Salary'],
          ['location', 'Location'],
          ['linkedin', 'LinkedIn'],
          ['github', 'GitHub'],
        ].map(([key, label]) => (
          <label key={key} className="grid gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
            <input
              value={(form as any)[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className={inputClass}
              placeholder={label}
            />
          </label>
        ))}
        {/* Qualification */}
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Qualification</span>
          <select
            value={form.qualification}
            onChange={(e) => handleChange('qualification', e.target.value)}
            className={inputClass}
          >
            <option>IT</option>
            <option>Non-IT</option>
            <option>Others</option>
          </select>
        </label>
        {/* Notice Period */}
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Notice Period (days)</span>
          <input
            type="number"
            min="0"
            placeholder="Notice Period"
            value={form.notice_period}
            onChange={(e) => handleChange('notice_period', e.target.value)}
            className={inputClass}
          />
        </label>
        {/* Education */}
        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Education</span>
          <input
            type="text"
            placeholder="Highest qualification / degree"
            value={form.education}
            onChange={(e) => handleChange('education', e.target.value)}
            className={inputClass}
          />
        </label>
        {/* Message for HR */}
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Message for HR</span>
          <textarea
            rows={3}
            placeholder="Any notes or message for the HR"
            value={form.hr_message}
            onChange={(e) => handleChange('hr_message', e.target.value)}
            className={inputClass}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Domain</span>
          <select
            value={form.domain}
            onChange={(e) => handleChange('domain', e.target.value)}
            className={inputClass}
          >
            {domains.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Job Role</span>
          <select
            value={form.job_role}
            onChange={(e) => handleChange('job_role', e.target.value)}
            className={inputClass}
          >
            {jobRoles.map((job) => (
              <option key={job}>{job}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Skills (comma separated)
          </span>
          <input
            value={form.skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            className={inputClass}
            placeholder="Python, React, AWS, Communication"
          />
        </label>

        {isHR && (
          <label className="grid gap-2 lg:col-span-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              HR Job Description / Hiring Requirement
            </span>
            <textarea
              rows={4}
              value={form.job_description}
              onChange={(e) => handleChange('job_description', e.target.value)}
              className={inputClass}
              placeholder="Human HR can paste the IT or Non-IT job description here. The AI interviewer will ask resume + job-description based questions."
            />
          </label>
        )}

            {/* Gender Selection */}
            <label className="grid gap-2 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Gender</span>
              <div className="flex gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={selectedAvatar === 'female'}
                    onChange={() => setSelectedAvatar('female')}
                    className="form-radio h-4 w-4 text-emerald-600"
                  />
                  <span className="ml-2">Female</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={selectedAvatar === 'male'}
                    onChange={() => setSelectedAvatar('male')}
                    className="form-radio h-4 w-4 text-emerald-600"
                  />
                  <span className="ml-2">Male</span>
                </label>
              </div>
            </label>

        {/* Avatar Selection Cards */}
        <div className="grid gap-3 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Choose Your AI HR Recruiter
          </span>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Female Avatar Card */}
            <div
              onClick={() => setSelectedAvatar('female')}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300 flex items-center gap-4 ${selectedAvatar === 'female'
                  ? 'border-emerald-500 bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-slate-850">
                <img src={femaleAvatar} alt="HR Priya" className="h-full w-full object-cover" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">HR Priya</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Senior Technical Recruiter</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Voice: Indian Accent (Female)</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      previewRecruiterVoice('female', 'english')
                    }}
                    className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Test English
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      previewRecruiterVoice('female', 'hindi')
                    }}
                    className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-600"
                  >
                    Test Hindi
                  </button>
                </div>
              </div>
              {selectedAvatar === 'female' && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </div>

            {/* Male Avatar Card */}
            <div
              onClick={() => setSelectedAvatar('male')}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300 flex items-center gap-4 ${selectedAvatar === 'male'
                  ? 'border-emerald-500 bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <div className="h-16 w-16 overflow-hidden rounded-full border border-white/10 bg-slate-850">
                <img src={maleAvatar} alt="HR Amit" className="h-full w-full object-cover" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">HR Amit</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Principal Recruiter</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Voice: Indian Accent (Male)</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      previewRecruiterVoice('male', 'english')
                    }}
                    className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                  >
                    Test English
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      previewRecruiterVoice('male', 'hindi')
                    }}
                    className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-emerald-600"
                  >
                    Test Hindi
                  </button>
                </div>
              </div>
              {selectedAvatar === 'male' && (
                <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Language Selection */}
        <div className="grid gap-3 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Select Interview Language
          </span>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* English Option */}
            <div
              onClick={() => setSelectedLanguage('english')}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300 flex items-center justify-between ${selectedLanguage === 'english'
                  ? 'border-emerald-500 bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">English</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Interview in English</p>
              </div>
              {selectedLanguage === 'english' && (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </div>

            {/* Hindi Option */}
            <div
              onClick={() => setSelectedLanguage('hindi')}
              className={`relative cursor-pointer rounded-2xl border-2 p-4 transition-all duration-300 flex items-center justify-between ${selectedLanguage === 'hindi'
                  ? 'border-emerald-500 bg-emerald-50/10 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
            >
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-slate-100">हिंदी (Hindi)</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">साक्षात्कार हिंदी में</p>
              </div>
              {selectedLanguage === 'hindi' && (
                <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>
              )}
            </div>
          </div>
        </div>

        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Resume Upload
          </span>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResume(e.target.files?.[0] || null)}
            className="block w-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
          />
        </label>

        <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center">
          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Processing...' : 'Register & Start Interview'}
          </button>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            Resume match + fit score + first question generated instantly.
          </span>
        </div>
      </form>

      {message && (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm break-words whitespace-pre-line ${
          message.toLowerCase().includes('error') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('unsupported') || message.toLowerCase().includes('not accepted')
            ? 'border-red-500/40 bg-red-500/10 text-red-300'
            : message.toLowerCase().includes('success')
            ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-sm'
        }`}>
          <span className="font-semibold">Message: </span>
          {message}
        </div>
      )}
    </div>
  )
}
