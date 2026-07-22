/**
 * AvatarPanel v2 — MP4 video avatar + Web Audio lipsync
 * female-ai.mp4 / male-ai.mp4 loop as AI HR avatar
 */

import { useEffect, useRef, useState } from 'react'
import { useInterviewStore } from '../../store/interviewStore'

// ⚠️  Place these files in frontend/src/assets/
// female-ai.mp4 and male-ai.mp4
import femaleVideo from '../../assets/female-ai.mp4'
import maleVideo from '../../assets/male-ai.mp4'

interface AvatarPanelProps {
  audioUrl?: string
  fallbackText?: string
  isThinking?: boolean
  language?: 'en' | 'hi'
}

export default function AvatarPanel({
  audioUrl,
  fallbackText,
  isThinking = false,
  language = 'en',
}: AvatarPanelProps) {

  const [mouthOpen, setMouthOpen] = useState(0)
  const [speaking, setSpeaking] = useState(false)

  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioElRef = useRef<HTMLAudioElement | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const { profile } = useInterviewStore()
  const isFemale = (profile.avatarGender || 'female') === 'female'
  const recruiterName = isFemale ? 'Priya' : 'Amit'
  const videoSrc = isFemale ? femaleVideo : maleVideo

  const statusLabel = speaking
    ? (language === 'hi' ? 'बोल रहा है' : 'Speaking')
    : isThinking
      ? (language === 'hi' ? 'सोच रहा है' : 'Analyzing')
      : (language === 'hi' ? 'तैयार' : 'Ready')

  const dotColor = speaking ? 'bg-emerald-400' : isThinking ? 'bg-indigo-400' : 'bg-slate-500'

  // ElevenLabs audio lipsync
  useEffect(() => {
    if (!audioUrl) { setSpeaking(false); setMouthOpen(0); return }
    if (audioElRef.current) { audioElRef.current.pause(); audioElRef.current.src = '' }
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)

    const audio = new Audio(audioUrl)
    audioElRef.current = audio
    setSpeaking(true)

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!audioContextRef.current) audioContextRef.current = new AudioCtx()
      const ctx = audioContextRef.current
      if (ctx.state === 'suspended') void ctx.resume()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      const source = ctx.createMediaElementSource(audio)
      source.connect(analyser)
      analyser.connect(ctx.destination)
    } catch (e) { console.warn('Web Audio:', e) }

    void audio.play().catch((e) => console.warn('Autoplay:', e))

    const buf = new Uint8Array(analyserRef.current?.frequencyBinCount || 128)
    const tick = () => {
      if (!analyserRef.current || audio.paused) { setMouthOpen(0); if (audio.paused) setSpeaking(false); return }
      analyserRef.current.getByteFrequencyData(buf)
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length
      setMouthOpen((p) => p + (Math.min(1, avg / 45) - p) * 0.45)
      animationFrameRef.current = requestAnimationFrame(tick)
    }
    audio.onended = () => { setSpeaking(false); setMouthOpen(0); if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
    tick()
    return () => { audio.pause(); if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current) }
  }, [audioUrl])

  // Browser SpeechSynthesis fallback
  useEffect(() => {
    if (audioUrl) return
    if (!fallbackText || fallbackText === 'Complete registration to start the interview.') { setSpeaking(false); setMouthOpen(0); return }
    let mounted = true, simInterval: ReturnType<typeof setInterval>
    const speak = () => {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(fallbackText)
      utt.lang = language === 'hi' ? 'hi-IN' : 'en-IN'
      utt.rate = language === 'hi' ? 0.85 : 0.95
      if (language === 'hi') {
        const v = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith('hi'))
        if (v) utt.voice = v
      }
      utt.onstart = () => { if (!mounted) return; setSpeaking(true); let p = 0; simInterval = setInterval(() => { p += 0.35; setMouthOpen(0.4 + Math.sin(p) * 0.4 + Math.random() * 0.2) }, 60) }
      utt.onend = utt.onerror = () => { if (!mounted) return; setSpeaking(false); setMouthOpen(0); clearInterval(simInterval) }
      window.speechSynthesis.speak(utt)
    }
    if (!window.speechSynthesis.getVoices().length) { window.speechSynthesis.onvoiceschanged = () => setTimeout(speak, 300) }
    else { const t = setTimeout(speak, 300); return () => { mounted = false; clearTimeout(t); clearInterval(simInterval); window.speechSynthesis.cancel() } }
    return () => { mounted = false; clearInterval(simInterval); window.speechSynthesis.cancel() }
  }, [audioUrl, fallbackText, language])

  return (
    <div className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${dotColor}`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
          </span>
          <span className="text-sm font-semibold text-slate-100">
            AI Recruiter: <span className="text-emerald-400">{recruiterName}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
            {language === 'hi' ? 'हिंदी' : 'EN'}
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider ${speaking ? 'text-emerald-400' : isThinking ? 'text-indigo-400' : 'text-slate-400'}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* Video frame */}
      <div className="relative overflow-hidden bg-black" style={{ aspectRatio: '9/12' }}>
        <video
          src={videoSrc}
          autoPlay loop muted playsInline
          className={`h-full w-full object-cover transition-all duration-500
            ${isThinking ? 'brightness-50' : 'brightness-100'}
            ${speaking ? 'scale-[1.015]' : 'scale-100'}`}
        />

        {/* Grid overlay */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:18px_24px]" />

        {/* Speaking glow border */}
        <div className={`pointer-events-none absolute inset-0 border-2 transition-all duration-500 ${speaking ? 'border-emerald-500/30 shadow-[inset_0_0_50px_rgba(16,185,129,0.18)]' : 'border-transparent'}`} />

        {/* Lipsync overlay */}
        {speaking && (
          <div className="pointer-events-none absolute" style={{ bottom: '21%', left: '50%', transform: 'translateX(-50%)', width: '52px', height: '26px' }}>
            <svg viewBox="0 0 52 26" className="w-full h-full drop-shadow-[0_0_8px_rgba(16,185,129,0.9)]">
              <path
                d={`M2 ${13 - mouthOpen * 4} Q26 ${13 + mouthOpen * 10} 50 ${13 - mouthOpen * 4} Q26 ${13 - mouthOpen * 8} 2 ${13 - mouthOpen * 4}`}
                fill="rgba(16,185,129,0.35)" stroke="#10b981" strokeWidth="1.5"
              />
              <circle cx="26" cy="13" r={2 + mouthOpen * 4} fill="white" opacity="0.8" />
            </svg>
          </div>
        )}

        {/* Thinking spinner */}
        {isThinking && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/55 backdrop-blur-sm">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full border-2 border-indigo-400/40" />
              <span className="h-14 w-14 animate-spin rounded-full border-4 border-indigo-400 border-t-transparent" />
            </div>
            <p className="mt-3 text-xs text-indigo-300 animate-pulse">
              {language === 'hi' ? 'मूल्यांकन हो रहा है...' : 'Evaluating...'}
            </p>
          </div>
        )}

        {/* Voice bars */}
        {speaking && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-end gap-1 rounded-full bg-slate-950/70 border border-white/5 px-3 py-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="w-1 rounded-full bg-emerald-400/80 transition-all duration-75"
                style={{ height: `${Math.max(3, 3 + Math.sin(i * 0.7) * (mouthOpen * 18) + Math.random() * 6)}px` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}