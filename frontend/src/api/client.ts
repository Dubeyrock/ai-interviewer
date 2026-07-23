import axios from 'axios'

const configuredBaseURL = import.meta.env.VITE_API_BASE_URL
const fallbackBaseURLs = ['http://127.0.0.1:8001/api', 'http://127.0.0.1:8000/api']
const baseURL = configuredBaseURL || fallbackBaseURLs[0]
const localApiBaseURLs = Array.from(new Set([baseURL, ...fallbackBaseURLs]))
const requestTimeoutMs = 60000  // 60 seconds — Render cold start handle karne ke liye

const isLocalBaseURL = (url?: string) => Boolean(url && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/api\/?$/i.test(url))

export const getApiOrigin = () => {
  const activeBaseURL = api.defaults.baseURL || baseURL
  return activeBaseURL.replace(/\/api\/?$/, '')
}

export const api = axios.create({
  baseURL,
  timeout: requestTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type']
      delete config.headers['content-type']
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status

    // Stale / invalid / expired token → clear it and send the user to login
    // so they re-authenticate and get a fresh, valid token.
    if (status === 401) {
      const currentPath = `${window.location.pathname}${window.location.search}`
      localStorage.removeItem('token')
      window.dispatchEvent(new Event('roleChange'))
      if (!currentPath.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`
      }
      return Promise.reject(error)
    }

    const originalRequest = error.config
    const canUseLocalFallback = !configuredBaseURL || isLocalBaseURL(baseURL)

    if (!canUseLocalFallback || error.response || !originalRequest || originalRequest._retryWithFallback) {
      return Promise.reject(error)
    }

    const currentBaseURL = originalRequest.baseURL || baseURL
    const fallbackBaseURL = localApiBaseURLs.find((url) => url !== currentBaseURL)
    if (!fallbackBaseURL) {
      return Promise.reject(error)
    }

    originalRequest._retryWithFallback = true
    originalRequest.baseURL = fallbackBaseURL
    api.defaults.baseURL = fallbackBaseURL
    return api(originalRequest)
  },
)
