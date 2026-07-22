import ThankYouModal from '../components/shared/ThankYouModal';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, getApiOrigin } from '../api/client';
import { useInterviewStore } from '../store/interviewStore';
import { useWebSocket } from '../hooks/useWebSocket';
import QuestionDisplay from '../components/interview/QuestionDisplay';
import TranscriptBox from '../components/interview/TranscriptBox';
import ConfidenceMeter from '../components/interview/ConfidenceMeter';
import EmotionBadge from '../components/interview/EmotionBadge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import AvatarPanel from '../components/interview/AvatarPanel';
import VideoPanel from '../components/interview/VideoPanel';

import VoiceRecorder from '../components/interview/VoiceRecorder'
import EndInterviewScreen from '../components/interview/EndInterviewScreen'

const audioUrlFromBase64 = (audio: string, mimeType = 'audio/mpeg') => {
  console.log('[audioUrlFromBase64] Input - base64 length:', audio?.length || 0, 'mime type:', mimeType)
  
  if (!audio || audio.length === 0) {
    console.warn('[audioUrlFromBase64] Empty audio base64 string!')
    return ''
  }
  
  try {
    const byteCharacters = atob(audio)
    console.log('[audioUrlFromBase64] Decoded byte characters length:', byteCharacters.length)
    
    const byteArrays = []
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)
      const byteNumbers = Array.from(slice).map((char) => char.charCodeAt(0))
      byteArrays.push(new Uint8Array(byteNumbers))
    }
    
    const blob = new Blob(byteArrays, { type: mimeType })
    console.log('[audioUrlFromBase64] Created blob, size:', blob.size, 'bytes')
    
    const url = URL.createObjectURL(blob)
    console.log('[audioUrlFromBase64] Created object URL:', url)
    
    return url
  } catch (error) {
    console.error('[audioUrlFromBase64] Error converting base64:', error)
    return ''
  }
}

export default function CandidateInterview() {
  const [searchParams] = useSearchParams()
  const videoPanelRef = useRef<any>(null)

  const {
    profile,
    currentQuestion,
    setCurrentQuestion,
    transcript,
    setTranscript,
    setResult,
    setProfile,
    emotion,
    confidence,
  } = useInterviewStore()

  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionData, setSessionData] = useState<any>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [questionAudioUrl, setQuestionAudioUrl] = useState<string>('');
  const [videoUploadState, setVideoUploadState] = useState<'idle' | 'uploading' | 'done'>('idle');

  const [showThankYou, setShowThankYou] = useState(false);

  const processedMessageCountRef = useRef(0)

  // ── CHANGE A: language from store ─────────────────────────────────────────
  const interviewLanguage = (profile.language as 'en' | 'hi') || 'en'

  const sessionId = useMemo(
    () => searchParams.get('sessionId') || profile.sessionId,
    [profile.sessionId, searchParams]
  )

  const wsUrl = useMemo(() => {
    if (!sessionId) return null
    const origin = getApiOrigin()
    const wsOrigin = origin.replace(/^http/, 'ws')
    return `${wsOrigin}/ws/interview/${sessionId}`
  }, [sessionData?.id, sessionId])

  const { connected, messages, sendJson, sendAudioAnswer } = useWebSocket(wsUrl)

  // ── Boot: load session data ───────────────────────────────────────────────
  useEffect(() => {
    const boot = async () => {
      if (!sessionId) return
      const { data } = await api.get(`/interview/${sessionId}`)
      setSessionData(data)
      setCurrentQuestion(data.current_question)
      const savedGender =
        (localStorage.getItem('selected_avatar_gender') as 'female' | 'male') || 'female'
      const normalizedGender = savedGender === 'male' ? 'male' : 'female'
      setProfile({
        candidateId: data.candidate_id,
        sessionId: data.id,
        name: data.candidate_name,
        domain: data.domain,
        jobRole: data.job_role,
        fitScore: data.fit_score,
        recommendation: data.recommendation,
        avatarGender: normalizedGender,
        // language already in store from registration — no override needed
      })
    }
    boot().catch(() => undefined)
  }, [sessionId, setCurrentQuestion, setProfile])

  useEffect(() => {
    if (!transcript) setTranscript('')
  }, [setTranscript, transcript])

// ── WebSocket message handler ─────────────────────────────────────────────
   useEffect(() => {
     if (processedMessageCountRef.current >= messages.length) return

     const newMessages = messages.slice(processedMessageCountRef.current)
     processedMessageCountRef.current = messages.length

     newMessages.forEach((message) => {
       if (message.type === 'ready') {
         setStatusMessage('Realtime interview connected.')
         return
       }

       if (message.type === 'question') {
         console.log('[WebSocket] Question message received:', message.message?.substring(0, 50))
         console.log('[WebSocket] Audio info - provider:', message.tts_provider, 'mime:', message.audio_mime_type, 'audio size:', message.audio?.length || 0)
         setCurrentQuestion(message.message)
         setQuestionAudioUrl((prev: string) => {
           if (prev) URL.revokeObjectURL(prev)
           const audioUrl = audioUrlFromBase64(message.audio || '', message.audio_mime_type)
           console.log('[WebSocket] Created audio URL:', audioUrl ? 'valid' : 'empty', 'from base64 length:', message.audio?.length || 0)
           return audioUrl
         })
         return
       }

       if (message.type === 'evaluation') {
         setTranscript(message.transcript || '')
         setResult({
           score: message.score,
           feedback: message.feedback,
           emotion: message.emotion,
           confidence: message.confidence,
         })
         if (message.next_question) setCurrentQuestion(message.next_question)
         setSessionData((prev: any) => ({
           ...prev,
           answers: Array.from({ length: message.answers_count || prev?.answers?.length || 0 }),
           current_question: message.next_question || prev?.current_question,
           status: message.status || prev?.status,
         }))
         setStatusMessage(`Realtime answer scored ${message.score}/10. ${message.feedback}`)
         return
       }

       if (message.type === 'complete') {
         console.log('[WebSocket] Interview complete message received:', message)
         setStatusMessage('Interview completed. HR report is ready for review.')
         setShowThankYou(true)
         
         // CRITICAL: Update sessionData to mark interview as completed
         // This triggers the video upload effect
         setSessionData((prev: any) => ({
           ...prev,
           status: 'completed',
           interview_scores: message.interview_scores || prev?.interview_scores,
           final_recommendation: message.final_recommendation || prev?.final_recommendation,
           answers: Array.from({ length: message.answers_count || prev?.answers?.length || 0 }),
         }))
         return
       }

       if (message.type === 'error') {
         setStatusMessage(message.message)
       }
     })
   }, [messages, setCurrentQuestion, setResult, setTranscript])

  // ── Cleanup audio object URLs ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (questionAudioUrl) URL.revokeObjectURL(questionAudioUrl)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl, questionAudioUrl])

// ── Submit answer (WebSocket or REST fallback) ────────────────────────────
   const submitAnswer = async () => {
     const answerText = answer.trim() || transcript.trim()
     if (!sessionId || !answerText) return
     setLoading(true)
     setStatusMessage(connected ? 'Sending realtime answer...' : 'Evaluating answer...')
     try {
       if (connected) {
         sendJson({
           type: 'text_answer',
           answer: answerText,
           transcript: transcript || answerText,
           emotion,
           confidence,
           language: profile.language || 'en',
         })
         setAnswer('')
         return
       }

      const { data } = await api.post('/interview/answer', {
        session_id: sessionId,
        answer: answerText,
        transcript: transcript || answerText,
        emotion: 'confident',
      })
      setResult({
        score: data.score,
        feedback: data.feedback,
        emotion: 'confident',
        confidence: data.confidence,
      })
      setCurrentQuestion(data.next_question)
      
      // Check if interview is completed based on status field
      const isCompleted = data.status === 'completed'
      console.log('[REST Answer] Response status:', data.status, 'isCompleted:', isCompleted)
      
      setSessionData((prev: any) => ({
        ...prev,
        current_question: data.next_question,
        status: data.status || 'active',
        // Append the submitted answer so answersCount increments correctly
        answers: [...(prev?.answers || []), answerText],
        interview_scores: isCompleted ? {
          technical_score: data.technical_score || 0,
          communication_score: data.communication_score || 0,
          confidence_score: data.confidence_score || 0,
          role_fit_score: data.role_fit_score || 0,
          behavioral_score: data.behavioral_score || 0,
          final_combined_score: data.final_score || 0,
        } : prev?.interview_scores,
        final_recommendation: isCompleted ? data.recommendation : prev?.final_recommendation,
      }))
      
      setAnswer('')
      setStatusMessage(`Answer scored ${data.score}/10. Final recommendation: ${data.recommendation}`)
    } catch (error: any) {
      setStatusMessage(error?.response?.data?.detail || 'Could not submit answer')
    } finally {
      setLoading(false)
    }
  }

  const answersCount = sessionData?.answers?.length || 0

  // ── Check if interview is completed ────────────────────────────────────────
  const isInterviewCompleted = sessionData?.status === 'completed'

  // ── Upload video when interview completes ─────────────────────────────────
  useEffect(() => {
    if (!isInterviewCompleted || !sessionId || videoUploadState !== 'idle') return

    const uploadVideo = async () => {
      try {
        setVideoUploadState('uploading')
        setStatusMessage('Uploading your interview video... Please wait.')
        console.log('[Video Upload] Starting upload for session:', sessionId)
        
        if (!videoPanelRef.current?.getRecordedVideo) {
          console.warn('[Video Upload] getRecordedVideo method not available')
          setVideoUploadState('done')
          return
        }

        const videoBlob = await videoPanelRef.current.getRecordedVideo()
        console.log('[Video Upload] Got video blob:', videoBlob?.size || 'null', 'bytes')
        
        if (!videoBlob || videoBlob.size === 0) {
          console.warn('[Video Upload] Video blob is empty or null')
          setStatusMessage('Interview completed (video not captured)')
          setVideoUploadState('done')
          return
        }

        const formData = new FormData()
        formData.append('file', videoBlob, 'interview-video.webm')
        
        console.log('[Video Upload] Uploading to /video/upload with sessionId:', sessionId)
        const response = await api.post(`/video/upload?session_id=${sessionId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        
        console.log('[Video Upload] Success! Response:', response.data)
        setStatusMessage('Interview video uploaded successfully. Preparing final results...')
      } catch (error: any) {
        console.error('[Video Upload] Upload failed:', error?.response?.data || error?.message || error)
        setStatusMessage('Interview completed (video upload had issues, but results are ready)')
      } finally {
        setVideoUploadState('done')
      }
    }

    uploadVideo()
  }, [isInterviewCompleted, sessionId, videoUploadState])

  // ── Render ────────────────────────────────────────────────────────────────
  if (isInterviewCompleted && sessionData?.interview_scores && videoUploadState === 'done') {
    return (
      <EndInterviewScreen
        sessionId={sessionId || ''}
        scores={sessionData.interview_scores}
        recommendation={sessionData.final_recommendation || 'PENDING'}
        candidateName={profile.name || 'Candidate'}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">

      {/* Top row: question + candidate info */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        <QuestionDisplay question={currentQuestion} />
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <EmotionBadge emotion={emotion} />
              <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs text-indigo-300 border border-indigo-500/30">
                {interviewLanguage === 'hi' ? 'हिंदी' : 'English'}
              </span>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-sm">
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Candidate</dt>
                <dd className="mt-1 break-words font-semibold text-white">{profile.name || 'N/A'}</dd>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Domain</dt>
                <dd className="mt-1 break-words font-semibold text-white">{profile.domain || 'N/A'}</dd>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Answers Submitted</dt>
                <dd className="mt-1 font-semibold text-white">{answersCount}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="mb-6 rounded-[2rem] border border-white/10 bg-slate-950/40 p-4 shadow-2xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Live Interview Room</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">AI HR and Candidate</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 ${connected ? 'bg-emerald-400/15 text-emerald-200' : 'bg-amber-400/15 text-amber-200'}`}>
              {connected ? 'Realtime connected' : 'REST fallback mode'}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
              {interviewLanguage === 'hi' ? 'Hindi' : 'English'}
            </span>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <AvatarPanel
            audioUrl={questionAudioUrl}
            fallbackText={currentQuestion}
            isThinking={loading}
            language={interviewLanguage}
          />
          <VideoPanel ref={videoPanelRef} />
        </div>
      </div>

      {/* Main grid: answer panel + right sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">

        {/* Left: answer input */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
          <h2 className="text-xl font-semibold">Candidate Answer</h2>
          <p className="mt-2 text-sm text-slate-400">
            {interviewLanguage === 'hi'
              ? 'यहाँ टाइप करें या आवाज़ में जवाब दें।'
              : 'Type here or record your voice. The current question is spoken automatically.'}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full px-3 py-1 ${connected
                ? 'bg-emerald-400/15 text-emerald-200'
                : 'bg-amber-400/15 text-amber-200'
              }`}>
              {connected ? 'Realtime connected' : 'REST fallback mode'}
            </span>
            {sessionData?.status && (
              <span className="rounded-full bg-white/10 px-3 py-1 text-slate-200">
                Status: {sessionData.status}
              </span>
            )}
          </div>
          <textarea
            rows={10}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-white dark:bg-slate-950 p-4 outline-none focus:border-emerald-400 text-slate-900 dark:text-slate-100"
            placeholder={
              interviewLanguage === 'hi'
                ? 'यहाँ अपना उत्तर लिखें...'
                : 'Type the candidate answer here...'
            }
          />
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={submitAnswer}
              disabled={loading || !sessionId}
              className="rounded-2xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? (interviewLanguage === 'hi' ? 'भेज रहे हैं...' : 'Submitting...')
                : (interviewLanguage === 'hi' ? 'उत्तर भेजें' : 'Submit Answer')}
            </button>
            {loading && <LoadingSpinner />}
            {!sessionId && (
              <span className="text-sm text-amber-300">
                {interviewLanguage === 'hi'
                  ? 'कोई सेशन नहीं मिला। पहले रजिस्टर करें।'
                  : 'No session found. Please register first.'}
              </span>
            )}
          </div>
          {statusMessage && (
            <p className={`mt-4 text-sm ${
              statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('failed')
                ? 'text-red-400'
                : statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('completed')
                ? 'text-emerald-400'
                : 'text-slate-700 dark:text-slate-300'
            }`}>
              {statusMessage}
            </p>
          )}
        </div>

        {/* Right: avatar + webcam + voice + transcript */}
<div className="space-y-4">

           <VoiceRecorder
             language={interviewLanguage === 'hi' ? 'hindi' : 'english'}
             onTranscript={(text) => {
               setTranscript(text)
               if (!answer.trim()) setAnswer(text)
             }}
             onRecordingReady={(blob) => {
               if (audioUrl) URL.revokeObjectURL(audioUrl)
               setAudioUrl(URL.createObjectURL(blob))
               if (connected) {
                 setStatusMessage(
                   interviewLanguage === 'hi'
                     ? 'रियलटाइम STT को ऑडियो भेज रहे हैं...'
                     : 'Sending audio to realtime STT...'
                 )
                 void sendAudioAnswer(blob, { transcript, emotion, confidence, language: profile.language || 'en' })
               }
             }}
           />

          {audioUrl && (
            <audio controls src={audioUrl} className="w-full">
              Audio recording
            </audio>
          )}

          <TranscriptBox transcript={transcript} />
          <ConfidenceMeter value={confidence || 0.72} />

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h3 className="mb-2 text-lg font-medium">
              {interviewLanguage === 'hi' ? 'इंटरव्यू सारांश' : 'Interview Summary'}
            </h3>
            <p className="text-sm leading-6 text-slate-300">
              {interviewLanguage === 'hi'
                ? 'AI प्रत्येक प्रश्न रिज्यूमे + JD + पिछले उत्तर के आधार पर बनाता है। 8 उत्तरों के बाद इंटरव्यू पूरा होता है।'
                : 'The AI generates each next question from resume + job description + role + domain + past answer score. The MVP interview completes after 8 submitted answers.'}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <h3 className="mb-2 text-lg font-medium">
              {interviewLanguage === 'hi' ? 'वर्तमान प्रश्न' : 'Current Question Snapshot'}
            </h3>
            <p className="text-sm leading-6 text-slate-300">
              {sessionData?.current_question || currentQuestion}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
