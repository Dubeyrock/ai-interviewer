import { useCallback, useRef, useState } from 'react'

export function useVoice() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<BlobPart[]>([])

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      setAudioBlob(new Blob(chunksRef.current, { type: 'audio/webm' }))
      stream.getTracks().forEach((track) => track.stop())
    }

    recorder.start()
    mediaRecorderRef.current = recorder
    setRecording(true)
  }, [])

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }, [])

  return { recording, audioBlob, start, stop, setAudioBlob }
}
