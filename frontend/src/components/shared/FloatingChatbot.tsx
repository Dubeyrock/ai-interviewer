import { useState, useRef, useEffect } from 'react'
import { api } from '../../api/client'
import { useInterviewStore } from '../../store/interviewStore'

type Track = 'it' | 'non-it'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const quickChips: Record<Track, string[]> = {
  it: ['Interview process?', 'Technical questions?', 'What to prepare?', 'System design topics?'],
  'non-it': ['HR questions?', 'Behavioral prep?', 'Domain switch?', 'Experience topics?'],
}

const fallbackResponses: Record<string, string> = {
  'Interview process?': 'Our AI interview process takes 15-20 minutes. You\'ll answer 8 adaptive questions based on your resume and the job description. The system evaluates technical skills, communication, and confidence.',
  'Technical questions?': 'Expect coding problems, system design, and domain-specific questions. We cover algorithms, data structures, and your experience level.',
  'What to prepare?': 'Review your resume thoroughly. Prepare examples of your projects and experiences. For technical roles, refresh key CS fundamentals.',
  'System design topics?': 'Common topics: microservices, databases, caching, load balancing, and scalable architecture patterns.',
  'HR questions?': 'Expect behavioral questions: Tell me about yourself, strengths/weaknesses, teamwork scenarios, and job-specific challenges.',
  'Behavioral prep?': 'Use STAR method (Situation, Task, Action, Result). Have specific examples ready for common scenarios.',
  'Domain switch?': 'Highlight transferable skills. Emphasize quick learning ability and past successful adaptations.',
  'Experience topics?': 'Discuss career progression, key achievements, and how your background fits this role.',
}

export default function FloatingChatbot() {
  const { profile } = useInterviewStore()
  const [open, setOpen] = useState(false)
  const [track, setTrack] = useState<Track>('it')
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI Interview Assistant. Choose your track or ask any interview question!' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user' as const, content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    // Try API first, fallback to local responses
    try {
      const { data } = await api.post('/chatbot/query', {
        question: text,
        track: track,
        candidate_id: profile.candidateId || undefined,
      })
      const botReply = data.answer || 'Sorry, I could not process that.'
      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }])
    } catch (error) {
      // Fallback to local responses if API fails
      const fallback = fallbackResponses[text] || `I'm here to help with ${track === 'it' ? 'technical' : 'HR/behavioral'} interview questions. Try asking about the specific topics or click a quick chip above!`
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition hover:bg-emerald-600"
        aria-label="Open interview chatbot"
      >
        <span className="text-2xl">💬</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between rounded-t-2xl bg-slate-100 dark:bg-slate-800 p-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100">Interview Assistant</h3>
        <button
          onClick={() => setOpen(false)}
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          ✕
        </button>
      </div>

      {/* Track Switch */}
      <div className="flex gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setTrack('it')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${track === 'it' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
        >
          IT Track
        </button>
        <button
          onClick={() => setTrack('non-it')}
          className={`rounded-full px-3 py-1 text-xs font-medium ${track === 'non-it' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}
        >
          Non-IT Track
        </button>
      </div>

      {/* Quick Chips */}
      <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
        {quickChips[track].map((chip) => (
          <button
            key={chip}
            onClick={() => sendMessage(chip)}
            disabled={loading}
            className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 max-h-64">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user' ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm text-slate-500">Typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
          placeholder="Ask about interview..."
          disabled={loading}
          className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none"
        />
      </div>
    </div>
  )
}