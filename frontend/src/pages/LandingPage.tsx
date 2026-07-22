import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { useState, useEffect, useRef } from 'react'
import {
  Bot, BarChart3, FileText, Globe, Briefcase, Activity,
  Zap, Shield, Clock, Users, ChevronLeft, ChevronRight,
  Star, CheckCircle2, ArrowRight, Sparkles
} from 'lucide-react'
import FloatingChatbot from '../components/shared/FloatingChatbot'
import logoImg from '../assets/logo.png'

/* ─── Animated Counter ─── */
function AnimatedCounter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const duration = 2000
          const steps = 60
          const increment = target / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= target) {
              setCount(target)
              clearInterval(timer)
            } else {
              setCount(Math.floor(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  )
}

/* ─── Floating Particles ─── */
function FloatingParticles() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full opacity-20"
          style={{
            width: `${Math.random() * 6 + 2}px`,
            height: `${Math.random() * 6 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `hsl(${Math.random() * 60 + 140}, 70%, 60%)`,
            animation: `float ${Math.random() * 6 + 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  )
}

/* ─── Testimonial Data ─── */
const testimonials = [
  {
    name: 'Priya Sharma',
    role: 'HR Head, TechNova Solutions',
    text: 'PratibhaAI cut our hiring time by 70%. The emotion analysis gives insights no human interviewer can catch consistently.',
    rating: 5,
    avatar: 'PS',
  },
  {
    name: 'Rahul Verma',
    role: 'CTO, StartupGrid India',
    text: 'We interviewed 200+ candidates in one week. The bilingual support is a game-changer for regional hiring.',
    rating: 5,
    avatar: 'RV',
  },
  {
    name: 'Anita Desai',
    role: 'VP People, FinEdge Corp',
    text: 'The PDF reports are so detailed our hiring managers make decisions in minutes instead of days. Incredible tool.',
    rating: 5,
    avatar: 'AD',
  },
]

/* ─── Pricing Plans ─── */
const plans = [
  {
    name: 'Starter',
    price: '0',
    period: 'Free forever',
    description: 'For small teams getting started',
    features: ['5 interviews/month', 'Basic scoring', 'Email support', 'PDF reports'],
    cta: 'Get Started Free',
    popular: false,
  },
  {
    name: 'Growth',
    price: '2,999',
    period: '/month',
    description: 'For growing companies',
    features: ['100 interviews/month', 'Emotion AI analysis', 'Priority support', 'Custom job roles', 'Video recording', 'Team collaboration'],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['Unlimited interviews', 'White-label branding', 'API access', 'Dedicated support', 'Custom integrations', 'SLA guarantee', 'On-premise option'],
    cta: 'Contact Sales',
    popular: false,
  },
]

export default function LandingPage() {
  const { isAuthenticated, role } = useAuth()
  const navigate = useNavigate()
  const [typedText, setTypedText] = useState('')
  const fullText = 'Hire Smarter. Interview Faster. Decide Better.'
  const [currentTestimonial, setCurrentTestimonial] = useState(0)

  const handlePlanClick = (planName: string) => {
    if (planName === 'Starter') {
      if (!isAuthenticated) {
        navigate('/register')
      } else if (role === 'hr') {
        navigate('/hr')
      } else if (role === 'candidate') {
        navigate('/interview')
      } else {
        navigate('/admin/dashboard')
      }
    } else if (planName === 'Growth') {
      if (!isAuthenticated) {
        navigate('/login?redirect=/hr/billing&upgrade=growth')
      } else if (role === 'hr') {
        navigate('/hr/billing?upgrade=growth')
      } else {
        toast.error('Please log in with an HR account to purchase subscription.')
        navigate('/login?redirect=/hr/billing&upgrade=growth')
      }
    } else { // Enterprise
      navigate('/contact-sales')
    }
  }

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 80)
    return () => clearInterval(timer)
  }, [])

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative flex items-center justify-center pt-24 pb-20 px-4 overflow-hidden">
        <FloatingParticles />

        {/* Gradient orbs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/15 rounded-full blur-3xl" />

        <div className="relative w-full max-w-5xl text-center z-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm text-emerald-700 dark:text-emerald-400 mb-6">
            <Sparkles className="h-4 w-4" />
            <span>India's #1 AI Interview Platform</span>
          </div>

          <div className="inline-flex items-center justify-center h-24 w-24 rounded-3xl bg-white shadow-2xl shadow-emerald-500/15 mb-8 overflow-hidden ring-4 ring-emerald-500/20 dark:bg-white dark:ring-emerald-500/30">
            <img src={logoImg} alt="PratibhaAI" className="h-full w-full object-contain p-2" />
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 dark:from-emerald-400 dark:via-teal-400 dark:to-indigo-400 mb-4 leading-tight">
            Pratibha<span className="text-indigo-600 dark:text-indigo-400">AI</span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-300 mb-4 h-8 font-medium">
            {typedText}<span className="animate-pulse text-emerald-500">|</span>
          </p>

          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            सही प्रतिभा, सही समय पर। AI-powered autonomous interviews with real-time emotion analysis, bilingual support, and instant PDF reports — built for modern Indian HR teams.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link
              to="/register"
              className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 px-8 py-4 font-semibold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Interview
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-2xl border-2 border-slate-300 dark:border-slate-600 bg-white/80 dark:bg-slate-800/50 px-8 py-4 font-semibold text-slate-900 dark:text-slate-100 transition-all hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-lg backdrop-blur-sm"
            >
              HR Login
            </Link>
          </div>

          {/* ── Hero Stats ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: 500, suffix: '+', label: 'Interviews Done' },
              { value: 98, suffix: '%', label: 'Time Saved' },
              { value: 50, suffix: '+', label: 'Companies' },
              { value: 4.9, suffix: '★', label: 'User Rating' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl bg-white/60 dark:bg-slate-800/40 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 px-4 py-5 transition hover:scale-105 hover:shadow-lg"
              >
                <p className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">
                  <AnimatedCounter target={stat.value} suffix={stat.suffix} />
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ PROBLEM → SOLUTION ═══════════ */}
      <section className="py-20 px-4 bg-white dark:bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-red-500/10 border border-red-500/20 px-4 py-1.5 text-sm text-red-600 dark:text-red-400 mb-4">The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              From Hiring Headaches to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400">Smart Hiring</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/10 dark:to-orange-900/10 rounded-3xl p-8 border border-red-100 dark:border-red-800/30">
              <h3 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-6 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-500/20">❌</span>
                Traditional Hiring Problems
              </h3>
              <ul className="space-y-4">
                {[
                  'HR spends 8+ hours daily on repetitive interviews',
                  'Interviewer bias affects hiring decisions',
                  'Manual scoring leads to inconsistency',
                  'No emotional intelligence insights',
                  'Reports take days to compile manually',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-red-400 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10 rounded-3xl p-8 border border-emerald-100 dark:border-emerald-800/30">
              <h3 className="text-xl font-semibold text-emerald-600 dark:text-emerald-400 mb-6 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-500/20">✅</span>
                PratibhaAI Solves This
              </h3>
              <ul className="space-y-4">
                {[
                  'Complete interviews in 20 minutes, fully automated',
                  'Bias-free AI evaluation for fair hiring',
                  'Consistent scoring system across all candidates',
                  'Real-time emotion + confidence tracking',
                  'Instant PDF reports with actionable insights',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-slate-700 dark:text-slate-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/30 dark:to-slate-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 text-sm text-indigo-600 dark:text-indigo-400 mb-4">Simple Process</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">How it works</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { step: '01', title: 'Upload Resume', desc: 'JD match + ATS score calculated instantly', color: 'emerald', icon: FileText },
              { step: '02', title: 'AI Interview', desc: 'Adaptive questions via voice, Hindi or English', color: 'indigo', icon: Bot },
              { step: '03', title: 'Live Analysis', desc: 'Emotion + confidence tracked in real-time', color: 'amber', icon: Activity },
              { step: '04', title: 'PDF Report', desc: 'Scores, emotions, shortlist decision — auto-generated', color: 'rose', icon: BarChart3 },
            ].map((item, i) => {
              const Icon = item.icon
              const colorMap: Record<string, string> = {
                emerald: 'from-emerald-500 to-teal-500',
                indigo: 'from-indigo-500 to-blue-500',
                amber: 'from-amber-500 to-orange-500',
                rose: 'from-rose-500 to-pink-500',
              }
              const bgMap: Record<string, string> = {
                emerald: 'bg-emerald-100 dark:bg-emerald-500/20',
                indigo: 'bg-indigo-100 dark:bg-indigo-500/20',
                amber: 'bg-amber-100 dark:bg-amber-500/20',
                rose: 'bg-rose-100 dark:bg-rose-500/20',
              }
              return (
                <div
                  key={item.step}
                  className="group text-center relative"
                >
                  {i < 3 && (
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-slate-300 to-transparent dark:from-slate-600" />
                  )}
                  <div className={`relative z-10 inline-flex items-center justify-center h-16 w-16 rounded-2xl ${bgMap[item.color]} mb-4 transition-transform group-hover:scale-110 group-hover:shadow-lg`}>
                    <Icon className={`h-7 w-7 text-transparent bg-clip-text bg-gradient-to-r ${colorMap[item.color]}`} style={{ color: `var(--tw-gradient-from)` }} />
                  </div>
                  <div className="inline-block rounded-full bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                    Step {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ FEATURES GRID ═══════════ */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-4 py-1.5 text-sm text-emerald-600 dark:text-emerald-400 mb-4">Features</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Powerful Features for Modern HR
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">Everything you need to revolutionize your hiring process</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Bot, title: 'AI HR Avatar', desc: 'Voice-based interviews with natural conversation flow and adaptive questioning', color: 'emerald' },
              { icon: BarChart3, title: 'Smart Scoring', desc: 'Technical + behavioral assessment combined with ML-powered evaluation', color: 'indigo' },
              { icon: Activity, title: 'Emotion AI', desc: 'Real-time confidence, stress, and engagement tracking via advanced analysis', color: 'amber' },
              { icon: FileText, title: 'PDF Reports', desc: 'Auto-generated detailed reports with scores, insights, and recommendations', color: 'rose' },
              { icon: Globe, title: 'Hindi + English', desc: 'Full bilingual support — candidates can interview in their preferred language', color: 'blue' },
              { icon: Briefcase, title: 'IT + Non-IT', desc: 'Domain-specific adaptive questions for technical and non-technical roles', color: 'purple' },
            ].map((feature) => {
              const Icon = feature.icon
              const iconBgMap: Record<string, string> = {
                emerald: 'bg-emerald-100 dark:bg-emerald-500/20',
                indigo: 'bg-indigo-100 dark:bg-indigo-500/20',
                amber: 'bg-amber-100 dark:bg-amber-500/20',
                rose: 'bg-rose-100 dark:bg-rose-500/20',
                blue: 'bg-blue-100 dark:bg-blue-500/20',
                purple: 'bg-purple-100 dark:bg-purple-500/20',
              }
              const iconColorMap: Record<string, string> = {
                emerald: 'text-emerald-600 dark:text-emerald-400',
                indigo: 'text-indigo-600 dark:text-indigo-400',
                amber: 'text-amber-600 dark:text-amber-400',
                rose: 'text-rose-600 dark:text-rose-400',
                blue: 'text-blue-600 dark:text-blue-400',
                purple: 'text-purple-600 dark:text-purple-400',
              }
              return (
                <div key={feature.title} className="group rounded-3xl bg-white dark:bg-slate-800/50 p-7 shadow-sm border border-slate-200/50 dark:border-slate-700/50 hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-700/50 transition-all duration-300 hover:-translate-y-1">
                  <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl ${iconBgMap[feature.color]} mb-5 group-hover:scale-110 transition-transform`}>
                    <Icon className={`h-7 w-7 ${iconColorMap[feature.color]}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ═══════════ SOCIAL PROOF (LOGOS) ═══════════ */}
      <section className="py-16 px-4 bg-slate-50 dark:bg-slate-900/30 border-y border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 uppercase tracking-wider">
            Trusted by innovative companies across India
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-14 opacity-60">
            {['TechNova', 'StartupGrid', 'FinEdge', 'CloudNine', 'DataPulse', 'InnoVate'].map((name) => (
              <div key={name} className="flex items-center gap-2 transition hover:opacity-100">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-500 flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{name[0]}</span>
                </div>
                <span className="text-lg font-semibold text-slate-700 dark:text-slate-300">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TESTIMONIALS ═══════════ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 text-sm text-amber-600 dark:text-amber-400 mb-4">Testimonials</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              What HR Leaders Say
            </h2>
          </div>

          <div className="relative">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentTestimonial * 100}%)` }}
              >
                {testimonials.map((t, idx) => (
                  <div key={idx} className="w-full flex-shrink-0 px-4">
                    <div className="mx-auto max-w-2xl rounded-3xl bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 p-8 md:p-10 shadow-lg text-center">
                      <div className="flex justify-center gap-1 mb-6">
                        {Array.from({ length: t.rating }).map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <p className="text-lg md:text-xl text-slate-700 dark:text-slate-300 mb-8 leading-relaxed italic">
                        "{t.text}"
                      </p>
                      <div className="flex items-center justify-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                          {t.avatar}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length)}
                className="h-10 w-10 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="flex gap-2">
                {testimonials.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentTestimonial(idx)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      idx === currentTestimonial
                        ? 'w-8 bg-emerald-500'
                        : 'w-2.5 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrentTestimonial((prev) => (prev + 1) % testimonials.length)}
                className="h-10 w-10 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ PRICING ═══════════ */}
      <section className="py-20 px-4 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-teal-500/10 border border-teal-500/20 px-4 py-1.5 text-sm text-teal-600 dark:text-teal-400 mb-4">Pricing</span>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-600 dark:text-slate-400">Start free. Scale as you grow.</p>
          </div>
          <div className="grid gap-8 md:grid-cols-3 items-start">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-3xl p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${
                  plan.popular
                    ? 'bg-gradient-to-b from-emerald-600 to-teal-700 dark:from-emerald-500 dark:to-teal-600 text-white shadow-2xl shadow-emerald-500/25 scale-[1.03] ring-2 ring-emerald-400/50'
                    : 'bg-white dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-slate-900 shadow-lg">
                    🔥 MOST POPULAR
                  </div>
                )}
                <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mb-6 ${plan.popular ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  {plan.description}
                </p>
                <div className="mb-8">
                  <span className={`text-4xl font-extrabold ${plan.popular ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                    {plan.price === 'Custom' ? '' : '₹'}{plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {plan.period}
                  </span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className={`h-4 w-4 shrink-0 ${plan.popular ? 'text-emerald-200' : 'text-emerald-500'}`} />
                      <span className={plan.popular ? 'text-emerald-50' : 'text-slate-700 dark:text-slate-300'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePlanClick(plan.name)}
                  className={`block w-full text-center rounded-2xl px-6 py-3 font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    plan.popular
                      ? 'bg-white text-emerald-700 hover:bg-emerald-50 shadow-lg'
                      : 'bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA SECTION ═══════════ */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-500 dark:to-teal-500 p-12 md:p-16 shadow-2xl shadow-emerald-500/20">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Transform Your Hiring?
            </h2>
            <p className="text-lg text-emerald-100 mb-8 max-w-xl mx-auto">
              Join 50+ companies already using PratibhaAI to hire smarter, faster, and without bias.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 font-semibold text-emerald-700 transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                Start Free Interview
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/book-demo"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-white/30 px-8 py-4 font-semibold text-white transition-all hover:bg-white/10"
              >
                Book a Demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="bg-slate-900 dark:bg-slate-950 text-slate-300 py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-10 mb-12">
            <div className="md:col-span-1">
              <Link to="/" className="text-xl font-bold text-white mb-3 inline-block">
                Pratibha<span className="text-emerald-400">AI</span>
              </Link>
              <p className="text-sm text-slate-400 leading-relaxed">
                AI-powered autonomous interviewing platform built for modern Indian HR teams.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-3">
                <li><Link to="/features" className="text-sm hover:text-emerald-400 transition">Features</Link></li>
                <li><Link to="/how-it-works" className="text-sm hover:text-emerald-400 transition">How it works</Link></li>
                <li><Link to="/login" className="text-sm hover:text-emerald-400 transition">HR Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm hover:text-emerald-400 transition">About Us</a></li>
                <li><a href="#" className="text-sm hover:text-emerald-400 transition">Careers</a></li>
                <li><a href="#" className="text-sm hover:text-emerald-400 transition">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><a href="#" className="text-sm hover:text-emerald-400 transition">Privacy Policy</a></li>
                <li><a href="#" className="text-sm hover:text-emerald-400 transition">Terms of Service</a></li>
                <li><a href="#" className="text-sm hover:text-emerald-400 transition">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-500 text-sm">
              © 2026 PratibhaAI — Made in India 🇮🇳
            </p>
            <p className="text-slate-600 text-sm">
              Built by <span className="text-emerald-400 font-medium">Shivam Dubey</span> — AI Developer
            </p>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot */}
      <FloatingChatbot />
    </div>
  )
}