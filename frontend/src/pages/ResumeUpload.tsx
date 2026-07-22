import { useState } from 'react'
import { api } from '../api/client'

export default function ResumeUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [domain, setDomain] = useState('IT')
  const [jobRole, setJobRole] = useState('Frontend Developer')
  const [jobDescription, setJobDescription] = useState('')
  const [result, setResult] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const upload = async () => {
    if (!file) {
      setMessage('Please choose a resume file first.')
      return
    }
    const form = new FormData()
    form.append('file', file)
    form.append('domain', domain)
    form.append('job_role', jobRole)
    form.append('job_description', jobDescription)

    setLoading(true)
    setMessage('')
    try {
      const { data } = await api.post('/resume/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(data)
      setMessage('Resume parsed successfully.')
    } catch (error: any) {
      setMessage(error?.response?.data?.detail || 'Resume upload failed. Please check backend server.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-emerald-400'

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Resume Analysis
        </h1>
        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
          Upload resume and let AI match it with the role.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={inputClass}
            placeholder="Domain"
          />
          <input
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value)}
            className={inputClass}
            placeholder="Job role"
          />
        </div>

        <textarea
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          className={`${inputClass} mt-4`}
          placeholder="Job description"
        />

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-4 block w-full rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
        />

        <button
          onClick={upload}
          disabled={loading}
          className="mt-4 rounded-2xl bg-amber-500 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Uploading...' : 'Upload & Parse'}
        </button>

        {message && (
          <p className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            message.toLowerCase().includes('error') || message.toLowerCase().includes('failed')
              ? 'border-red-500/40 bg-red-500/10 text-red-300'
              : message.toLowerCase().includes('success')
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300'
          }`}>
            {message}
          </p>
        )}

        {result && (
          <div className="mt-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 shadow-sm space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <p><strong>Fit Score:</strong> {result.fit_score}</p>
            <p><strong>Recommendation:</strong> {result.recommendation}</p>
            <p><strong>Matched Skills:</strong> {result.matched_skills?.join(', ')}</p>
            <p><strong>Missing Skills:</strong> {result.missing_skills?.join(', ')}</p>
            <p><strong>Summary:</strong> {result.summary}</p>
          </div>
        )}
      </div>
    </div>
  )
}
