import { Link } from 'react-router-dom'
import {
  Users,
  Share2,
  UserPlus,
  Bot,
  Headphones,
  BarChart3,
  Video,
  FileCheck2,
  CheckCircle2,
  ArrowRight,
  Briefcase,
} from 'lucide-react'

const steps = [
  {
    number: '01',
    title: 'HR creates a job',
    description:
      'Define role, set criteria, and configure interview questions tailored to your open position.',
    icon: Briefcase,
  },
  {
    number: '02',
    title: 'HR shares the invite link',
    description:
      'Send the interview link directly to candidates or post it on your careers page.',
    icon: Share2,
  },
  {
    number: '03',
    title: 'Candidate registers and uploads resume',
    description:
      'Candidate signs up, submits their resume, and confirms the interview slot.',
    icon: UserPlus,
  },
  {
    number: '04',
    title: 'AI starts the interview',
    description:
      'A conversational AI avatar greets the candidate and begins the session.',
    icon: Bot,
  },
  {
    number: '05',
    title: 'System asks resume + JD based questions',
    description:
      'Smart adaptive questions evaluate skills, experience, and role fit in real time.',
    icon: Headphones,
  },
  {
    number: '06',
    title: 'AI evaluates answers in real time',
    description:
      'Confidence, emotion, and communication quality are analyzed live during the interview.',
    icon: BarChart3,
  },
  {
    number: '07',
    title: 'HR reviews video, score, and PDF report',
    description:
      'Compare candidates side by side using recorded interviews, scores, and auto-generated reports.',
    icon: FileCheck2,
  },
]

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
            How it works
          </div>
          <h1 className="mt-6 text-4xl font-extrabold text-slate-900 dark:text-white md:text-5xl">
            From job posting to hiring decision
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            A simple, automated interview flow that saves time and improves candidate quality.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 hidden h-full w-px bg-emerald-200 dark:border-emerald-500/30 md:block" />

          <div className="space-y-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative flex flex-col gap-4 md:flex-row md:items-center md:gap-10"
              >
                <div className="flex items-center gap-4 md:w-64">
                  <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white shadow-sm dark:border-emerald-500/30 dark:bg-slate-900">
                    <step.icon className="h-7 w-7 text-emerald-700 dark:text-emerald-400" />
                    <span className="absolute -right-2 -top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white dark:bg-emerald-500">
                      {step.number}
                    </span>
                  </div>
                  <div className="md:hidden">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {step.description}
                    </p>
                  </div>
                </div>

                <div className="hidden md:block">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {step.description}
                  </p>
                </div>

                {step.number !== '07' && (
                  <div className="hidden md:flex md:items-center md:justify-end md:px-4">
                    <ArrowRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}

                {step.number === '07' && (
                  <div className="hidden md:flex md:items-center md:justify-end md:px-4">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Start hiring with AI
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
