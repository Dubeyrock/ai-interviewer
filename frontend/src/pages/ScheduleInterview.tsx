import React, { useState, useEffect } from 'react';
import { scheduleInterview } from '../api/schedule';
import { listJobs, Job } from '../api/job';
import { toast } from 'react-hot-toast';

export default function ScheduleInterview() {
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [hrName, setHrName] = useState('')
  const [interviewRole, setInterviewRole] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedJobId, setSelectedJobId] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loadingJobs, setLoadingJobs] = useState(true)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const data = await listJobs()
        setJobs(data.jobs || [])
      } catch (err) {
        console.error('Failed to load jobs', err)
      } finally {
        setLoadingJobs(false)
      }
    }
    fetchJobs()
  }, [])

  const handleJobChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const jobId = e.target.value
    setSelectedJobId(jobId)
    const job = jobs.find(j => j.id === jobId)
    if (job) {
      setInterviewRole(job.job_title)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const payload: any = {
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        hr_name: hrName,
        interview_role: interviewRole,
        scheduled_at: scheduledAt,
      }
      if (selectedJobId) {
        payload.job_id = selectedJobId
      }
      const resp = await scheduleInterview(payload)
      setResult(resp.data)
      toast.success('Interview scheduled successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to schedule')
      toast.error(err.message || 'Failed to schedule')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl rounded-xl border border-white/10 shadow-xl">
      <h1 className="text-2xl font-bold text-center mb-4 text-slate-900 dark:text-white">
        Schedule Interview
      </h1>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <input
            type="text"
            placeholder="Candidate Name"
            value={candidateName}
            onChange={(e) => setCandidateName(e.target.value)}
            required
            className="w-full p-2 border rounded bg-white/50 dark:bg-gray-700/50 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
          />
        </div>
        <div>
          <input
            type="email"
            placeholder="Candidate Email"
            value={candidateEmail}
            onChange={(e) => setCandidateEmail(e.target.value)}
            required
            className="w-full p-2 border rounded bg-white/50 dark:bg-gray-700/50 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="HR Name"
            value={hrName}
            onChange={(e) => setHrName(e.target.value)}
            required
            className="w-full p-2 border rounded bg-white/50 dark:bg-gray-700/50 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
          />
        </div>
        <div>
          <select
            value={selectedJobId}
            onChange={handleJobChange}
            required
            className="w-full p-2 border rounded bg-white/50 dark:bg-gray-700/50 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
          >
            <option value="">Select Job (optional)</option>
            {loadingJobs ? (
              <option value="" disabled>Loading jobs...</option>
            ) : (
              jobs.map(job => (
                <option key={job.id} value={job.id}>{job.job_title}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <input
            type="text"
            placeholder="Interview Role"
            value={interviewRole}
            onChange={(e) => setInterviewRole(e.target.value)}
            required
            className="w-full p-2 border rounded bg-white/50 dark:bg-gray-700/50 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
          />
        </div>
        <div className="md:col-span-2">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="w-full p-2 border rounded bg-white/50 dark:bg-gray-700/50 text-slate-900 dark:text-white focus:border-sky-500 focus:ring-2 focus:ring-sky-200 transition"
          />
        </div>
        <button
          type="submit"
          className="col-span-2 w-full bg-sky-600 hover:bg-sky-700 text-white py-2 rounded transition transform hover:scale-105"
        >
          Schedule
        </button>
      </form>

      {error && <p className="mt-2 text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 p-4 bg-white/20 dark:bg-gray-700/30 backdrop-blur-sm rounded-lg border border-white/10">
          <p className="font-medium">Interview scheduled successfully!</p>
          <p>
            Meeting Link: <a href={result.meeting_link} className="text-blue-600 underline" target="_blank" rel="noreferrer">{result.meeting_link}</a>
          </p>
          <p>Scheduled At: {new Date(result.scheduled_at).toLocaleString()}</p>
          <p>Candidate Email: {result.candidate_email}</p>
          <p>Email Status: <span className={result.email_status === 'sent' ? 'text-green-600' : 'text-red-600'}>{result.email_status}</span></p>
          {result.calendar_event_url && (
            <a
              href={result.calendar_event_url}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
            >
              Add to Google Calendar
            </a>
          )}
        </div>
      )}
    </div>
  );
}
