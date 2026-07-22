import { create } from 'zustand'

type CandidateProfile = {
  candidateId: string | null
  sessionId: string | null
  name: string
  email: string
  domain: string
  jobRole: string
  fitScore: number
  recommendation: string
  avatarGender: 'female' | 'male'
  language: 'en' | 'hi'   // FIXED: 'english'/'hindi' → 'en'/'hi'
  gender: 'female' | 'male'
}

type InterviewState = {
  profile: CandidateProfile
  currentQuestion: string
  transcript: string
  score: number
  feedback: string
  emotion: string
  confidence: number
  setProfile: (profile: Partial<CandidateProfile>) => void
  setSessionId: (id: string | null) => void
  setCurrentQuestion: (q: string) => void
  setTranscript: (t: string) => void
  setResult: (payload: Partial<Pick<InterviewState, 'score' | 'feedback' | 'emotion' | 'confidence'>>) => void
  reset: () => void
}

const initialProfile: CandidateProfile = {
  candidateId: null,
  sessionId: null,
  name: '',
  email: '',
  domain: '',
  jobRole: '',
  fitScore: 0,
  recommendation: 'PENDING',
  avatarGender: 'female',
  language: 'en',   // FIXED: default 'en'
  gender: 'female',
}

export const useInterviewStore = create<InterviewState>((set) => ({
  profile: initialProfile,
  currentQuestion: 'Complete registration to start the interview.',
  transcript: '',
  score: 0,
  feedback: '',
  emotion: 'neutral',
  confidence: 0,

  setProfile: (profile) =>
    set((state) => ({ profile: { ...state.profile, ...profile } })),

  setSessionId: (id) =>
    set((state) => ({ profile: { ...state.profile, sessionId: id } })),

  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setTranscript: (t) => set({ transcript: t }),
  setResult: (payload) => set(payload),

  reset: () =>
    set({
      profile: initialProfile,
      currentQuestion: 'Complete registration to start the interview.',
      transcript: '',
      score: 0,
      feedback: '',
      emotion: 'neutral',
      confidence: 0,
    }),
}))