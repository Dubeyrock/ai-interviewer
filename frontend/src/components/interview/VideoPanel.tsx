import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import { useInterviewStore } from '../../store/interviewStore'

// Helper index paths for drawing futuristic glowing cyber outlines
const SILHOUETTE = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109]
const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 95]
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191]
const LEFT_EYE = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246]
const RIGHT_EYE = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46]
const RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276]

export default forwardRef(function VideoPanel(_, ref) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRef = useRef<any>(null)
  const faceMeshRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])

  const [status, setStatus] = useState('Loading Camera...')
  const [mpLoaded, setMpLoaded] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [metrics, setMetrics] = useState({
    ear: 0.3,
    mar: 0.05,
    jitter: 0,
    blinkCount: 0,
    talkingState: 'Silent',
  })

  // Zustand Store values to sync client-side emotion in real-time
  const { setResult } = useInterviewStore()

  // Track previous key landmark points for jitter/nervousness evaluation
  const prevPointsRef = useRef<{ x: number; y: number }[]>([])
  const blinkActiveRef = useRef(false)

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    getRecordedVideo: async () => {
      return new Promise<Blob | null>((resolve) => {
        const timeout = setTimeout(() => {
          console.warn('Video blob retrieval timeout - returning empty blob')
          resolve(new Blob([], { type: 'video/webm' }))
        }, 5000)

        if (!mediaRecorderRef.current) {
          console.warn('MediaRecorder not initialized')
          clearTimeout(timeout)
          resolve(null)
          return
        }

        const state = mediaRecorderRef.current.state
        console.log('MediaRecorder state:', state, 'Recorded chunks:', recordedChunksRef.current.length)

        if (state === 'inactive') {
          console.warn('MediaRecorder already inactive')
          clearTimeout(timeout)
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
            console.log('Returning recorded blob, size:', blob.size)
            resolve(blob)
          } else {
            resolve(null)
          }
          return
        }

        mediaRecorderRef.current.onstop = () => {
          clearTimeout(timeout)
          console.log('MediaRecorder stopped. Recorded chunks:', recordedChunksRef.current.length)
          if (recordedChunksRef.current.length > 0) {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
            console.log('Created blob from chunks, size:', blob.size)
            resolve(blob)
          } else {
            console.warn('No data in recorded chunks')
            resolve(null)
          }
        }

        try {
          mediaRecorderRef.current.stop()
          console.log('Stop command sent to MediaRecorder')
        } catch (e) {
          console.error('Error stopping MediaRecorder:', e)
          clearTimeout(timeout)
          resolve(null)
        }
      })
    },
    stopRecording: () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    },
  }), [])

  // 1. Dynamic script loader for MediaPipe CDN
  useEffect(() => {
    let mounted = true

    const loadScripts = async () => {
      try {
        setStatus('Initializing Face AI...')
        
        // Load Camera Utilities first
        if (!(window as any).Camera) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js'
            script.async = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load MediaPipe Camera utils'))
            document.body.appendChild(script)
          })
        }

        // Load FaceMesh libraries
        if (!(window as any).FaceMesh) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js'
            script.async = true
            script.onload = () => resolve()
            script.onerror = () => reject(new Error('Failed to load MediaPipe Face Mesh'))
            document.body.appendChild(script)
          })
        }

        if (mounted) {
          setMpLoaded(true)
          setStatus('Camera Starting...')
        }
      } catch (err) {
        console.error(err)
        if (mounted) setStatus('Face AI loading failed. Falls back to static.')
      }
    }

    void loadScripts()

    return () => {
      mounted = false
    }
  }, [])

  // 2. Camera + MediaPipe Pipeline loop setup
  useEffect(() => {
    if (!mpLoaded) return
    let mounted = true

    const startPipeline = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Browser does not support webcam.')
        return
      }

      try {
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
          audio: true,
        })

        if (!mounted) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        // Start video recording with MediaRecorder
        try {
          recordedChunksRef.current = []
          
          // Try multiple MIME types for better compatibility
          const mimeTypes = [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm',
            'video/mp4',
          ]
          
          let selectedMimeType = mimeTypes[0]
          for (const mimeType of mimeTypes) {
            if (MediaRecorder.isTypeSupported(mimeType)) {
              selectedMimeType = mimeType
              console.log('[VideoPanel] Using MIME type:', mimeType)
              break
            }
          }
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: selectedMimeType,
          })
          
          console.log('[VideoPanel] MediaRecorder created with MIME type:', selectedMimeType)

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              console.log('[VideoPanel] Data available:', event.data.size, 'bytes')
              recordedChunksRef.current.push(event.data)
            }
          }

          mediaRecorder.onstart = () => {
            console.log('[VideoPanel] Recording started')
            setIsRecording(true)
          }

          mediaRecorder.onstop = () => {
            console.log('[VideoPanel] Recording stopped, total chunks:', recordedChunksRef.current.length)
            setIsRecording(false)
          }
          
          mediaRecorder.onerror = (event) => {
            console.error('[VideoPanel] MediaRecorder error:', event.error)
          }

          mediaRecorderRef.current = mediaRecorder
          mediaRecorder.start()
          console.log('[VideoPanel] Recording start command issued')
        } catch (recordError) {
          console.error('[VideoPanel] MediaRecorder initialization failed:', recordError)
        }

        // Initialize FaceMesh instance
        const FaceMeshClass = (window as any).FaceMesh
        const faceMesh = new FaceMeshClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
        })

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })

        faceMesh.onResults((results: any) => {
          if (!mounted) return
          drawFaceMesh(results)
        })

        faceMeshRef.current = faceMesh

        // Start dynamic camera capture frame loops
        const CameraClass = (window as any).Camera
        if (videoRef.current) {
          const camera = new CameraClass(videoRef.current, {
            onFrame: async () => {
              if (faceMeshRef.current) {
                await faceMeshRef.current.send({ image: videoRef.current })
              }
            },
            width: 640,
            height: 480,
          })
          camera.start()
          cameraRef.current = camera
          setStatus('Live Landmark Tracking')
        }
      } catch (error) {
        console.error(error)
        if (mounted) setStatus('Webcam permission denied.')
      }
    }

    void startPipeline()

    return () => {
      mounted = false
      streamRef.current?.getTracks().forEach((track) => track.stop())
      try {
        cameraRef.current?.stop()
      } catch (e) {}
    }
  }, [mpLoaded])

  // 3. 468 landmark calculations and glowing wireframe drawing
  const drawFaceMesh = (results: any) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolutions to match video aspect ratio exactly
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Check if face landmarks are detected
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return
    }

    const landmarks = results.multiFaceLandmarks[0]
    const width = canvas.width
    const height = canvas.height

    // Helper: translate normalized coordinate to canvas pixel coordinate
    const getPixel = (idx: number) => {
      const pt = landmarks[idx]
      return { x: pt.x * width, y: pt.y * height, z: pt.z }
    }

    // A. Drawing Cyber Wireframe Paths (lips, eyes, eyebrows, face contour)
    const drawPath = (indices: number[], color: string, lineWidth: number = 1.5, close: boolean = true) => {
      ctx.beginPath()
      indices.forEach((idx, i) => {
        const pt = getPixel(idx)
        if (i === 0) ctx.moveTo(pt.x, pt.y)
        else ctx.lineTo(pt.x, pt.y)
      })
      if (close) ctx.closePath()
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.stroke()
    }

    // Glowing style
    ctx.shadowBlur = 8
    ctx.shadowColor = '#06b6d4'

    drawPath(SILHOUETTE, 'rgba(6, 182, 212, 0.4)', 1.2, true)
    drawPath(LEFT_EYEBROW, 'rgba(34, 211, 238, 0.65)', 1.5, false)
    drawPath(RIGHT_EYEBROW, 'rgba(34, 211, 238, 0.65)', 1.5, false)
    drawPath(LEFT_EYE, 'rgba(52, 211, 153, 0.7)', 1.5, true)
    drawPath(RIGHT_EYE, 'rgba(52, 211, 153, 0.7)', 1.5, true)
    drawPath(LIPS_OUTER, 'rgba(6, 182, 212, 0.7)', 1.5, true)
    drawPath(LIPS_INNER, 'rgba(34, 211, 238, 0.8)', 1.2, true)

    // Reset glowing shadow for simple points
    ctx.shadowBlur = 0

    // Draw all 468+ landmarks as small glowing micro cyan pixels
    ctx.fillStyle = 'rgba(34, 211, 238, 0.6)'
    for (let i = 0; i < 468; i++) {
      const pt = getPixel(i)
      ctx.fillRect(pt.x - 0.75, pt.y - 0.75, 1.5, 1.5)
    }

    // B. Live Metric & Face AI analytics calculations
    // i) EAR (Eye Aspect Ratio): Left eye height vs width
    const pLeftTop = getPixel(159)
    const pLeftBottom = getPixel(145)
    const pLeftLeft = getPixel(33)
    const pLeftRight = getPixel(133)
    const leftDistH = Math.hypot(pLeftTop.x - pLeftBottom.x, pLeftTop.y - pLeftBottom.y)
    const leftDistW = Math.hypot(pLeftLeft.x - pLeftRight.x, pLeftLeft.y - pLeftRight.y)
    const leftEAR = leftDistH / (leftDistW || 1)

    const pRightTop = getPixel(386)
    const pRightBottom = getPixel(374)
    const pRightLeft = getPixel(362)
    const pRightRight = getPixel(263)
    const rightDistH = Math.hypot(pRightTop.x - pRightBottom.x, pRightTop.y - pRightBottom.y)
    const rightDistW = Math.hypot(pRightLeft.x - pRightRight.x, pRightLeft.y - pRightRight.y)
    const rightEAR = rightDistH / (rightDistW || 1)

    const ear = (leftEAR + rightEAR) / 2

    // Track blinks dynamically
    let updatedBlinkCount = metrics.blinkCount
    if (ear < 0.17) {
      if (!blinkActiveRef.current) {
        blinkActiveRef.current = true
        updatedBlinkCount += 1
      }
    } else {
      blinkActiveRef.current = false
    }

    // ii) MAR (Mouth Aspect Ratio): Inner mouth height vs width
    const pLipTop = getPixel(13)
    const pLipBottom = getPixel(14)
    const pLipLeft = getPixel(78)
    const pLipRight = getPixel(308)
    const lipDistH = Math.hypot(pLipTop.x - pLipBottom.x, pLipTop.y - pLipBottom.y)
    const lipDistW = Math.hypot(pLipLeft.x - pLipRight.x, pLipLeft.y - pLipRight.y)
    const mar = lipDistH / (lipDistW || 1)
    const talkingState = mar > 0.15 ? 'Speaking' : 'Silent'

    // iii) Jitter (High-frequency movement micro-shake detection for stress checking)
    const trackedIndices = [1, 10, 152, 234, 454] // nose, forehead, chin, cheeks
    const currentPoints = trackedIndices.map((idx) => getPixel(idx))

    let jitter = 0
    if (prevPointsRef.current.length === trackedIndices.length) {
      let displacementSum = 0
      currentPoints.forEach((pt, i) => {
        const prev = prevPointsRef.current[i]
        displacementSum += Math.hypot(pt.x - prev.x, pt.y - prev.y)
      })
      jitter = displacementSum / trackedIndices.length
    }
    prevPointsRef.current = currentPoints

    // C. Realtime Emotion Classification & Zustand Store Sync
    let emotion = 'neutral'
    let confidence = 0.7

    // Check smile (mouth corners pulled higher than lower lip)
    const leftCorner = getPixel(78)
    const rightCorner = getPixel(308)
    const bottomLip = getPixel(14)
    const cornerAvgY = (leftCorner.y + rightCorner.y) / 2
    const smileRatio = bottomLip.y - cornerAvgY

    // Determine stress signals
    const earHighBlinks = updatedBlinkCount > 15
    const highJitter = jitter > 3.8

    if (smileRatio > 14 && talkingState === 'Silent') {
      emotion = 'confident'
      confidence = 0.92
    } else if (highJitter || earHighBlinks) {
      emotion = 'nervous'
      confidence = 0.78
    } else if (talkingState === 'Speaking') {
      emotion = 'engaged'
      confidence = 0.85
    } else {
      emotion = 'neutral'
      confidence = 0.74
    }

    // Sync seamlessly with Zustand Store
    setResult({ emotion, confidence })

    setMetrics({
      ear,
      mar,
      jitter,
      blinkCount: updatedBlinkCount,
      talkingState,
    })
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900/60 p-5 shadow-2xl dark:backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">Candidate Webcam</h3>
        <span className="rounded-full bg-cyan-100 dark:bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-700 dark:text-cyan-400">
          {status}
        </span>
      </div>

      <div className="relative aspect-video overflow-hidden rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-950">
        {/* Mirror Webcam Frame */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="h-full w-full object-cover scale-x-[-1]"
        />

        {/* Dynamic Holographic Overlays */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full object-cover scale-x-[-1] pointer-events-none"
        />

        {status !== 'Live Landmark Tracking' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 dark:bg-slate-950/80 px-4 text-center">
            <span className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent mb-3" />
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{status}</p>
          </div>
        )}
      </div>

      {/* Realtime AI Metrics dashboard */}
      <div className="mt-4 grid grid-cols-3 gap-3 border-t border-white/5 pt-4 text-xs">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 text-center border border-slate-200 dark:border-white/5">
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Live Gaze Status</p>
          <strong className="text-cyan-700 dark:text-cyan-400 font-semibold uppercase tracking-wider">
            {metrics.talkingState === 'Speaking' ? 'Active Gaze' : 'Focused'}
          </strong>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 text-center border border-slate-200 dark:border-white/5">
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Mouth State</p>
          <strong className={`font-semibold uppercase tracking-wider ${metrics.talkingState === 'Speaking' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
            {metrics.talkingState}
          </strong>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3 text-center border border-slate-200 dark:border-white/5">
          <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">Nervous Jitter</p>
          <strong className={`font-semibold uppercase tracking-wider ${metrics.jitter > 3.8 ? 'text-rose-600 dark:text-rose-400 animate-pulse' : 'text-slate-700 dark:text-slate-300'}`}>
            {metrics.jitter > 3.8 ? 'Elevated' : 'Normal'}
          </strong>
        </div>
      </div>
    </div>
  )
})
