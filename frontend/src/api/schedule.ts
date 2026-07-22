import { api } from './client'

export const scheduleInterview = async (payload: any) => {
  return api.post('/schedule', payload)
}