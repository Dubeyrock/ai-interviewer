/**
 * EndInterviewScreen v2
 * - Detailed scores (existing)
 * - Thank You message + checkmark animation
 * - Next Steps
 * - HR message "within 48 hours"
 * - Auto redirect countdown (10s)
 * - Exit button
 */

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface EndInterviewScreenProps {
  sessionId: string
  scores: {
    technical_score: number
    communication_score: number
    confidence_score: number
    role_fit_score: number
    behavioral_score: number
    final_combined_score: number
  }
  recommendation: string
  candidateName: string
}

export default function EndInterviewScreen({
  sessionId,
  scores,
  recommendation,
  candidateName,
}: EndInterviewScreenProps) {
  const navigate = useNavigate()
  const [countdown, setCountdown] = useState(15)
  const [showCheck, setShowCheck] = useState(false)

  // Animate checkmark after mount
  useEffect(() => {
    const t = setTimeout(() => setShowCheck(true), 300)
    return () => clearTimeout(t)
  }, [])

  // Countdown auto-redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          navigate('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [navigate])

  const rec = recommendation?.toUpperCase() || 'PENDING'

  const maskedRec = rec === 'REJECTED' ? 'PENDING' : rec

  const maskedRecConfig: Record<string, { gradient: string; icon: string; message: string }> = {
    SELECTED: {
      gradient: 'from-emerald-500 to-teal-600',
      icon: '🎉',
      message: 'Your interview has been recorded. HR will contact you within 48 hours.',
    },
    HOLD: {
      gradient: 'from-amber-500 to-orange-600',
      icon: '⏸️',
      message: 'Your profile is under review. We will contact you soon.',
    },
    REJECTED: {
      gradient: 'from-slate-500 to-slate-600',
      icon: '📋',
      message: 'Your interview has been recorded. HR will contact you within 48 hours.',
    },
    PENDING: {
      gradient: 'from-slate-500 to-slate-600',
      icon: '⏳',
      message: 'Your interview has been recorded. HR will contact you within 48 hours.',
    },
  }

  const { gradient, icon, message } = maskedRecConfig[maskedRec] || maskedRecConfig['PENDING']

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-2xl">

        {/* ── Main Card ── */}
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl overflow-hidden">

          {/* Top gradient bar */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-500 via-cyan-400 to-blue-500" />

          <div className="p-8">

            {/* ── Thank You Header ── */}
            <div className="text-center mb-8">
              {/* Animated checkmark */}
              <div className={`mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-500/40 bg-emerald-500/10 transition-all duration-700 ${showCheck ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                }`}>
                <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-white mb-1">
                Thank You, <span className="text-emerald-400">{candidateName}</span>!
              </h1>
              <p className="text-slate-400 text-sm">
                Your interview has been successfully completed and recorded.
              </p>
            </div>

            {/* ── Recommendation Badge ── */}
            <div className={`mb-8 rounded-2xl bg-gradient-to-r ${gradient} p-6 text-center shadow-lg`}>
              <div className="text-5xl mb-3">{icon}</div>
              <h2 className="text-2xl font-bold text-white mb-2">Interview Completed</h2>
              <p className="text-white/85 text-sm leading-relaxed">{message}</p>
            </div>

            {/* ── Next Steps ── */}
            <div className="mb-6 rounded-2xl bg-slate-800/40 border border-white/5 p-5">
              <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-widest mb-4">
                What Happens Next?
              </h4>
              <div className="space-y-3">
                {[
                  { icon: '📋', text: 'Your responses have been recorded and analyzed by AI' },
                  { icon: '🔍', text: 'HR team will review your complete interview performance' },
                  { icon: '📧', text: 'You will receive an update within 48 hours via email' },
                  { icon: '📞', text: 'If shortlisted, HR will contact you for the next round' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="text-base mt-0.5">{item.icon}</span>
                    <p className="text-sm text-slate-300 leading-snug">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── HR Message ── */}
            <div className="mb-8 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4">
              <p className="text-sm text-indigo-300 leading-relaxed">
                <span className="font-semibold">💬 Message from HR Team:</span><br />
                Thank you for taking the time to interview with us today. Our HR team will carefully review
                your performance and get back to you <strong>within 48 hours</strong>.
                We appreciate your interest and wish you the best!
              </p>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/')}
                className="flex-1 rounded-2xl bg-emerald-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400"
              >
                Exit Interview
              </button>
              <button
                onClick={() => navigate('/hr')}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                HR Dashboard
              </button>
            </div>

            {/* ── Countdown ── */}
            <p className="mt-5 text-center text-xs text-slate-600">
              Auto redirecting to home in{' '}
              <span className="text-slate-400 font-semibold">{countdown}s</span>...
            </p>

            {/* ── Session ID ── */}
            <div className="mt-6 border-t border-white/5 pt-4 text-center">
              <p className="text-xs text-slate-600">
                Session ID: <span className="font-mono">{sessionId}</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Thank you for using AI Interviewer Platform 🚀
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}