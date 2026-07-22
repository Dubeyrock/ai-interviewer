export default function EmotionBadge({ emotion }: { emotion: string }) {
  return (
    <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs text-slate-200">
      Emotion: {emotion}
    </span>
  )
}
