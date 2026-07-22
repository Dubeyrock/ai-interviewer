import { api } from './client'

export interface Job {
  id: string
  job_title: string
  domain: string
  job_description: string
  required_skills: string[]
  experience_level: string
  assign_candidate_email?: string
  interview_language: string
  interview_difficulty: string
  technical_weight: number
  behavioral_weight: number
  status: string
  created_at?: string
  updated_at?: string
  invite_link?: string
}

export interface JobCreate {
  job_title: string
  domain: string
  job_description: string
  required_skills?: string[]
  experience_level?: string
  assign_candidate_email?: string | null
  interview_language?: string
  interview_difficulty?: string
  status?: string
  technical_weight?: number
  behavioral_weight?: number
}

export interface JobUpdate {
  job_title?: string
  domain?: string
  job_description?: string
  required_skills?: string[]
  experience_level?: string
  assign_candidate_email?: string | null
  interview_language?: string
  interview_difficulty?: string
  status?: string
  technical_weight?: number
  behavioral_weight?: number
}

export const listJobs = async () => {
  const response = await api.get('/hr/jobs')
  return response.data
}

export const getJob = async (jobId: string) => {
  const response = await api.get(`/hr/jobs/${jobId}`)
  return response.data
}

export const createJob = async (payload: JobCreate) => {
  const response = await api.post('/hr/jobs', payload)
  return response.data
}

export const updateJob = async (jobId: string, payload: JobUpdate) => {
  const response = await api.put(`/hr/jobs/${jobId}`, payload)
  return response.data
}

export const deleteJob = async (jobId: string) => {
  const response = await api.delete(`/hr/jobs/${jobId}`)
  return response.data
}
