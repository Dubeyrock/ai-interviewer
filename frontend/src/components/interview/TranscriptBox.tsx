export default function TranscriptBox({ transcript }: { transcript: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <h3 className="mb-2 text-lg font-medium">Live Transcript</h3>
      <p className="min-h-24 whitespace-pre-wrap text-sm text-slate-300">
        {transcript || 'Transcript will appear here when you connect STT.'}
      </p>
    </div>
  )
}
