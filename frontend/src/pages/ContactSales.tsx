import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Bot, Send, MessageSquare, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react'
import { api } from '../api/client'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const quickChips = [
  'What are the plan prices?',
  'What is included in Growth?',
  'Do you offer a free trial?',
  'How does payment work?',
  'Tell me about Enterprise',
  'Is there an API / white-label?',
]

const fallbackResponses: Record<string, string> = {
  'What are the plan prices?': 'We have 3 plans: Starter is FREE (5 interviews/month), Growth is ₹2,999/month, and Enterprise is custom-priced. You can upgrade anytime from the Billing page.',
  'What is included in Growth?': 'Growth (₹2,999/month) gives 100 interviews/month, real-time Emotion AI, priority support, custom job roles, candidate video recording, team collaboration, and detailed PDF reports.',
  'Do you offer a free trial?': 'Yes! Starter is free forever with 5 interviews/month. You can also start a Growth plan and cancel anytime from Billing.',
  'How does payment work?': 'On the Billing page you can pay by Credit/Debit Card or UPI. A PDF receipt is emailed to you instantly after a successful payment.',
  'Tell me about Enterprise': 'Enterprise is custom-priced and includes unlimited interviews, white-label branding, API access, dedicated support, custom integrations, SLA guarantee, and on-premise option. Book a demo for a quote.',
  'Is there an API / white-label?': 'Yes — available on the Enterprise plan: white-label branding, API access, and on-premise deployment. Reach out via Book a Demo for details.',
}

export default function ContactSales() {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm the PratibhaAI Sales Assistant. Ask me anything about plans, pricing, payments, or enterprise features — or book a personalized demo with our team.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const { data } = await api.post('/chatbot/query', {
        question: text,
        track: 'sales',
      })
      const botReply = data.answer || 'Sorry, I could not process that.'
      setMessages((prev) => [...prev, { role: 'assistant', content: botReply }])
    } catch (error) {
      const fallback =
        fallbackResponses[text] ||
        'I can help with pricing (Starter free, Growth ₹2,999/month, Enterprise custom), payments (card/UPI), and enterprise features. For a custom quote, please book a demo.'
      setMessages((prev) => [...prev, { role: 'assistant', content: fallback }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
      {/* Header */}
      <div className="mx-auto max-w-6xl px-4 pt-12 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white sm:text-4xl">
          Contact Our <span className="text-emerald-600 dark:text-emerald-400">AI Sales Team</span>
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
          Chat with our AI assistant for instant answers on plans, pricing, and payments — or talk to a human for a
          custom enterprise quote.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-6xl gap-8 px-4 pb-16 lg:grid-cols-3">
        {/* Assistant Chat */}
        <div className="lg:col-span-2">
          <div className="flex h-[600px] flex-col overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">AI Sales Assistant</h3>
                <p className="text-xs text-emerald-600 dark:text-emerald-400">Online • typically replies instantly</p>
              </div>
            </div>

            {/* Quick chips */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 px-5 py-3">
              {quickChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => sendMessage(chip)}
                  disabled={loading}
                  className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 transition hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm text-slate-500">Typing…</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-slate-200 dark:border-slate-800 p-4">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                  placeholder="Ask about plans, pricing, payments…"
                  disabled={loading}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side panel: human handoff + demo */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              <h3 className="font-bold text-slate-900 dark:text-white">Talk to a Human</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
              Need a custom quote, security review, or on-premise deployment? Our sales team will get back within 24 hours.
            </p>
            <Link
              to="/book-demo"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
            >
              Book a Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-900 to-indigo-950 p-6 text-white shadow-xl">
            <span className="inline-block rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-4">
              Plans at a glance
            </span>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Starter</strong> — Free · 5 interviews/mo</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Growth</strong> — ₹2,999/mo · 100 interviews</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Enterprise</strong> — Custom · unlimited + API</span>
              </li>
            </ul>
            <Link
              to="/#pricing"
              className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:underline"
            >
              Compare all features <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
