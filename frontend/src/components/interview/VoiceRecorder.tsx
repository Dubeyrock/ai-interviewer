import { Mic, Square } from 'lucide-react'
import { useRef, useState } from 'react'

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export default function VoiceRecorder({
  onTranscript,
  onRecordingReady,
  language = 'english',
}: {
  onTranscript?: (text: string) => void
  onRecordingReady?: (blob: Blob) => void
  language?: 'english' | 'hindi'
}) {
  const [recording, setRecording] = useState(false)
  const [status, setStatus] = useState('Ready')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        onRecordingReady?.(blob)
        stream.getTracks().forEach((track) => track.stop())
      }
      recorder.start()
      recorderRef.current = recorder

      const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (Recognition) {
        const recognition: SpeechRecognitionLike = new Recognition()
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = language === 'hindi' ? 'hi-IN' : 'en-IN'
        recognition.onresult = (event: any) => {
          const text = Array.from(event.results)
            .map((result: any) => result[0]?.transcript || '')
            .join(' ')
            .trim()
          if (text) onTranscript?.(text)
        }
        recognition.onerror = (event: any) => {
          const error = event?.error
          if (error === 'no-speech' || error === 'aborted') {
            setStatus('Listening...')
          } else if (error === 'not-allowed') {
            setStatus('Microphone permission denied')
          } else if (error === 'network') {
            setStatus('Network error - check connection')
          } else {
            setStatus('Speech recognition issue, retrying...')
            if (recorderRef.current?.state === 'recording') {
              try { recognition.start() } catch { /* ignore */ }
            }
          }
        }
        recognition.onend = () => {
          if (recorderRef.current?.state === 'recording') {
            try {
              recognition.start()
            } catch {
              setStatus('Listening')
            }
          }
        }
        recognition.start()
        recognitionRef.current = recognition
        setStatus('Recording and transcribing')
      } else {
        setStatus('Recording audio. Live transcript is not supported here.')
      }
      setRecording(true)
    } catch (error) {
      setStatus('Microphone permission denied or unavailable.')
    }
  }

  const stop = () => {
    recognitionRef.current?.stop()
    recorderRef.current?.stop()
    setRecording(false)
    setStatus('Recording saved')
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Voice Recorder</h3>
        <button
          onClick={recording ? stop : start}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${recording ? 'bg-red-400 text-slate-950' : 'bg-emerald-400 text-slate-950'}`}
        >
          {recording ? <Square size={16} /> : <Mic size={16} />}
          {recording ? 'Stop' : 'Record'}
        </button>
      </div>
      <p className="mt-3 text-sm text-slate-300">{status}</p>
    </div>
  )
}