import { api } from './client'

export const bookDemo = (data: {
  name: string
  email: string
  phone?: string
  company?: string
  preferred_date?: string
  message?: string
}) => api.post('/contact/book-demo', data)
