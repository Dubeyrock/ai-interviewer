import { useEffect, useState, type RefObject } from 'react'

export function useFaceDetection(videoRef: RefObject<HTMLVideoElement>) {
  const [emotion, setEmotion] = useState('neutral')
  const [confidence, setConfidence] = useState(0.5)

  useEffect(() => {
    let interval: number | undefined

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        interval = window.setInterval(() => {
          const moods = ['neutral', 'confident', 'calm', 'uncertain']
          const next = moods[Math.floor(Math.random() * moods.length)]
          setEmotion(next)
          setConfidence(next === 'confident' || next === 'calm' ? 0.85 : 0.55)
        }, 2500)
      } catch {
        setEmotion('camera-off')
        setConfidence(0)
      }
    }

    void start()

    return () => {
      if (interval) window.clearInterval(interval)
      const stream = videoRef.current?.srcObject as MediaStream | null
      stream?.getTracks().forEach((track) => track.stop())
    }
  }, [videoRef])

  return { emotion, confidence }
}
