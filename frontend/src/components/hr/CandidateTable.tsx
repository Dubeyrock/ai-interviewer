import { getApiOrigin } from '../../api/client'

type CandidateRow = {
  session_id: string
  candidate_id?: string
  candidate_name: string
  domain: string
  job_role?: string
  total_score: number
  fit_score?: number
  answers_count: number
  status: string
  recommendation?: string
  has_resume?: boolean
}

export default function CandidateTable({
  candidates,
  loading = false,
  onDelete,
  onViewVideo,
}: {
  candidates: CandidateRow[]
  loading?: boolean
  onDelete?: (candidateId: string) => void
  onViewVideo?: (candidate: CandidateRow) => void
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-white/5 text-slate-200">
          <tr>
            <th className="px-4 py-3">Candidate</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Domain</th>
            <th className="px-4 py-3">Score</th>
            <th className="px-4 py-3">Answers</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Resume</th>
            <th className="px-4 py-3">Video</th>
            <th className="px-4 py-3">Action</th>
          </tr>
        </thead>

        <tbody>
          {loading && (
            <tr className="border-t border-white/5">
              <td className="px-4 py-5 text-slate-300" colSpan={9}>
                Loading candidates...
              </td>
            </tr>
          )}

          {!loading && candidates.length === 0 && (
            <tr className="border-t border-white/5">
              <td className="px-4 py-5 text-slate-300" colSpan={9}>
                No candidates registered yet.
              </td>
            </tr>
          )}

          {candidates.map((c) => (
            <tr key={c.session_id || c.candidate_id} className="border-t border-white/5">
              <td className="px-4 py-3">{c.candidate_name}</td>
              <td className="px-4 py-3">{c.job_role || '-'}</td>
              <td className="px-4 py-3">{c.domain}</td>
              <td className="px-4 py-3">{c.total_score}</td>
              <td className="px-4 py-3">{c.answers_count}</td>
              <td className="px-4 py-3">{c.recommendation || c.status}</td>

              <td className="px-4 py-3">
                {c.has_resume ? (
                  <a
                    href={`${getApiOrigin()}/api/candidates/${c.candidate_id}/resume/download`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 underline underline-offset-2 transition hover:text-emerald-300 text-xs"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-slate-500 text-xs">-</span>
                )}
              </td>

              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => onViewVideo?.(c)}
                  disabled={!c.session_id}
                  className="rounded-full border border-sky-300/60 px-3 py-1 text-xs font-medium text-sky-100 transition hover:bg-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  View Video
                </button>
              </td>

              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => c.candidate_id && onDelete?.(c.candidate_id)}
                  disabled={!c.candidate_id}
                  className="rounded-full border border-red-300/60 px-3 py-1 text-xs font-medium text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}