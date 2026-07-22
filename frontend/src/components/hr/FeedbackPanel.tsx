export default function FeedbackPanel({ feedback }: { feedback: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
        AI Feedback
      </h3>
      <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
        {feedback || 'No feedback yet.'}
      </p>
    </div>
  )
}