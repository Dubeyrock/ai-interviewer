export default function QuestionDisplay({ question }: { question: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <p className="mb-2 text-xs uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
        AI Question
      </p>
      <p className="text-xl leading-8 text-slate-900 dark:text-slate-100">
        {question}
      </p>
    </div>
  )
}