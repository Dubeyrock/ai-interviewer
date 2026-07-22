import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Mail, Phone, Building2, MessageSquare, User, ArrowRight, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { bookDemo } from '../api/contact'
import bookDemoImg from '../assets/book_demo.jpg'

const inputClass =
  'w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 focus:border-emerald-500 dark:focus:border-emerald-400'

export default function BookDemo() {
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    preferred_date: '',
    message: '',
  })

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await bookDemo({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        preferred_date: form.preferred_date || undefined,
        message: form.message || undefined,
      })
      toast.success('Demo request submitted! We will contact you shortly.')
      setSubmitted(true)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      toast.error(detail || 'Failed to submit. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Thank You!</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-8">
            We received your demo request. Our team will reach out within 24 hours to schedule your personalized walkthrough.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-8 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            Back to Home
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:flex justify-center">
          <img
            src={bookDemoImg}
            alt="Book a Demo"
            className="w-full h-auto max-w-md rounded-3xl shadow-lg"
          />
        </div>

        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <h1 className="mb-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">Book a Demo</h1>
          <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
            See PratibhaAI in action. Fill in your details and we will set up a personalized walkthrough.
          </p>

          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="relative">
              <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-12`}
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Full Name"
                required
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-12`}
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="Work Email"
                required
              />
            </div>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-12`}
                type="tel"
                value={form.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="Phone Number (optional)"
              />
            </div>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-12`}
                value={form.company}
                onChange={(e) => handleChange('company', e.target.value)}
                placeholder="Company Name (optional)"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                className={`${inputClass} pl-12`}
                type="date"
                value={form.preferred_date}
                onChange={(e) => handleChange('preferred_date', e.target.value)}
              />
            </div>
            <div className="relative">
              <MessageSquare className="absolute left-4 top-5 h-5 w-5 text-slate-400" />
              <textarea
                className={`${inputClass} pl-12`}
                value={form.message}
                onChange={(e) => handleChange('message', e.target.value)}
                placeholder="Tell us about your hiring needs (optional)"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Book Demo'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
