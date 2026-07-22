import { useCallback, useEffect, useRef, useState } from 'react'

export type WsMessage =
  | { type: 'ready'; session_id: string }
  | { type: 'question'; message: string; audio?: string; audio_mime_type?: string; tts_provider?: string }
  | {
    type: 'evaluation'
    score: number
    feedback: string
    confidence: number
    emotion: string
    tone: string
    transcript?: string
    next_question?: string
    recommendation?: string
    final_score?: number
    status?: string
    answers_count?: number
    max_questions?: number
  }
  | {
    answers_count: any;
    interview_scores: any;
    final_recommendation: any; type: 'complete'; message: string
  }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string }
  | { type: 'pong' }

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',', 2)[1] : result)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export function useWebSocket(url: string | null) {
  const wsRef = useRef<WebSocket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<WsMessage[]>([])

  useEffect(() => {
    if (!url) {
      setConnected(false)
      return
    }

    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onopen = () => setConnected(true)
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as WsMessage
        setMessages((prev) => [...prev, data])
      } catch {
        setMessages((prev) => [...prev, { type: 'info', message: event.data }])
      }
    }

    return () => ws.close()
  }, [url])

  const sendJson = useCallback((payload: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload))
    }
  }, [])

  const sendAudioAnswer = useCallback(
    async (blob: Blob, extras?: { transcript?: string; emotion?: string; confidence?: number; language?: string }) => {
      const audio = await blobToBase64(blob)
      sendJson({
        type: 'audio_answer',
        audio,
        mime_type: blob.type || 'audio/webm',
        language: extras?.language || 'english',
        ...extras,
      })
    },
    [sendJson],
  )

  return { connected, messages, sendJson, sendAudioAnswer }
}
