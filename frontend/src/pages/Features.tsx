import { Link } from 'react-router-dom'
import {
  Brain,
  MessageSquare,
  Languages,
  Activity,
  Video,
  FileText,
  Shield,
  Briefcase,
  CalendarCheck,
  Sparkles,
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Interviews',
    description:
      'Smart questions generated from resume + job description match so every candidate gets a relevant, consistent interview experience.',
  },
  {
    icon: MessageSquare,
    title: 'Smart Conversations',
    description:
      'Context-aware follow-up questions that go beyond scripted answers and actually test real understanding.',
  },
  {
    icon: Languages,
    title: 'Bilingual Voice Support',
    description:
      'Conduct interviews in English and Hindi with natural text-to-speech and speech-to-text accuracy.',
  },
  {
    icon: Activity,
    title: 'Real-Time Analysis',
    description:
      'Live confidence, emotion, and communication scoring powered by MediaPipe and fine-tuned LLMs.',
  },
  {
    icon: Video,
    title: 'Video Review',
    description:
      'HR can replay the full candidate interview video, review expressions, and compare multiple candidates.',
  },
  {
    icon: FileText,
    title: 'PDF Reports',
    description:
      'Auto-generated interview reports with scores, flagged moments, emotion summary, and a shortlist recommendation.',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description:
      'Candidate, HR, and Admin dashboards with the right permissions for every user type.',
  },
  {
    icon: Briefcase,
    title: 'Job Setup & Invite Links',
    description:
      'HR can create jobs, define criteria, and share invite links with candidates in one click.',
  },
  {
    icon: CalendarCheck,
    title: 'Schedule & Email Flow',
    description:
      'Interview slots, reminders, and follow-ups are handled automatically end to end.',
  },
]

export default function Features() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-16 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Product Features
          </div>
          <h1 className="mt-6 text-4xl font-extrabold text-slate-900 dark:text-white md:text-5xl">
            Built for modern hiring teams
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            A complete AI interview platform that helps you screen candidates faster, reduce bias, and make better hiring decisions.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-slate-900/50"
            >
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Get started
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
