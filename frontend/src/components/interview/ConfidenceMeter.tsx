export default function ConfidenceMeter({ value }: { value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm text-slate-300">Confidence</span>
        <span className="text-sm font-medium text-white">{Math.round(value * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  )
}
