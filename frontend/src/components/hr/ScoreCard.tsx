import { Users, TrendingUp, CheckCircle2, XCircle } from 'lucide-react'

const iconMap: Record<string, any> = {
  Candidates: Users,
  'Average Fit': TrendingUp,
  Selected: CheckCircle2,
  Rejected: XCircle,
}

const colorMap: Record<string, { bg: string; icon: string; text: string }> = {
  Candidates: {
    bg: 'bg-indigo-50 dark:bg-indigo-500/10',
    icon: 'text-indigo-600 dark:text-indigo-400',
    text: 'from-indigo-600 to-blue-600 dark:from-indigo-400 dark:to-blue-400',
  },
  'Average Fit': {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    icon: 'text-amber-600 dark:text-amber-400',
    text: 'from-amber-600 to-orange-600 dark:from-amber-400 dark:to-orange-400',
  },
  Selected: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    icon: 'text-emerald-600 dark:text-emerald-400',
    text: 'from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400',
  },
  Rejected: {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    icon: 'text-rose-600 dark:text-rose-400',
    text: 'from-rose-600 to-red-600 dark:from-rose-400 dark:to-red-400',
  },
}

export default function ScoreCard({ title, score }: { title: string; score: number }) {
  const Icon = iconMap[title] || Users
  const colors = colorMap[title] || colorMap['Candidates']

  return (
    <div className="group rounded-2xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{title}</p>
        <div className={`h-9 w-9 rounded-xl ${colors.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className={`h-4.5 w-4.5 ${colors.icon}`} />
        </div>
      </div>
      <p className={`text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r ${colors.text}`}>
        {typeof score === 'number' && !Number.isInteger(score) ? score.toFixed(1) : score}
      </p>
    </div>
  )
}