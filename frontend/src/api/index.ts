import axios from 'axios'
import toast from 'react-hot-toast'
import { savePendingRecord } from '../utils/offlineStore'

export function getToken(): string | null {
  try {
    const t = (window as any).__HA_TOKEN__
    if (t) return t
  } catch {}
  try { const t = sessionStorage.getItem('ha_token'); if (t) return t } catch {}
  try { const t = localStorage.getItem('ha_token'); if (t) return t } catch {}
  return null
}

// Set token immediately on module load
try {
  const t = sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token')
  if (t) (window as any).__HA_TOKEN__ = t
} catch {}

// Detect if running inside Capacitor native shell
const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
const API_BASE = isNative ? 'https://compcarehub.co.uk/api' : '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// NEVER redirect on 401 - let components handle their own auth errors
api.interceptors.response.use(
  (res) => res,
  (err) => Promise.reject(err)
)

export default api

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  pinLogin: (email: string, pin: string) => api.post('/auth/pin-login', { email, pin }),
  setPin: (pin: string) => api.post('/auth/set-pin', { pin }),
  removePin: () => api.delete('/auth/pin'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (cur: string, next: string) => api.put('/auth/change-password', { currentPassword: cur, newPassword: next }),
}

export const homesApi = {
  list: () => api.get('/homes'),
  get: (id: string) => api.get(`/homes/${id}`),
  dashboard: (id: string) => api.get(`/homes/${id}/dashboard`),
  create: (data: Record<string, unknown>) => api.post('/homes', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/homes/${id}`, data),
}

export const suApi = {
  list: (homeId: string, params?: Record<string, string>) =>
    api.get('/service-users', { params: { homeId, ...params } }),
  get: (id: string) => api.get(`/service-users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/service-users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/service-users/${id}`, data),
  getContacts: (id: string) => api.get(`/service-users/${id}/contacts`),
  addContact: (id: string, data: Record<string, unknown>) => api.post(`/service-users/${id}/contacts`, data),
  updateContact: (id: string, cid: string, data: Record<string, unknown>) => api.put(`/service-users/${id}/contacts/${cid}`, data),
  deleteContact: (id: string, cid: string) => api.delete(`/service-users/${id}/contacts/${cid}`),
  getDocuments: (id: string) => api.get(`/service-users/${id}/documents`),
  getMessages: (id: string) => api.get(`/service-users/${id}/messages`),
  sendMessage: (id: string, data: Record<string, unknown>) => api.post(`/service-users/${id}/messages`, data),
}

export const staffApi = {
  list: (params?: Record<string, string>) => api.get('/staff', { params }),
  get: (id: string) => api.get(`/staff/${id}`),
  create: (data: Record<string, unknown>) => api.post('/staff', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/staff/${id}`, data),
  clockIn: (id: string, data: Record<string, unknown>) => api.post(`/staff/${id}/clock`, data),
  clockHistory: (id: string) => api.get(`/staff/${id}/clock`),
  setPin: (id: string, pin: string) => api.put(`/staff/${id}/pin`, { pin }),
  removePin: (id: string) => api.delete(`/staff/${id}/pin`),
}

export const alertsApi = {
  list: (homeId: string, resolved = false) => api.get('/alerts', { params: { homeId, resolved } }),
  resolve: (id: string, notes?: string) => api.put(`/alerts/${id}/resolve`, { resolutionNotes: notes }),
}

export const dailyRecordsApi = {
  list: (suId: string, date?: string, recordType?: string) =>
    api.get('/daily-records', { params: { suId, date, recordType } }),
  create: async (data: Record<string, unknown>) => {
    if (!navigator.onLine) {
      const { suId, homeId, recordType, ...rest } = data as {
        suId: string
        homeId?: string
        recordType: string
        [key: string]: unknown
      }
      await savePendingRecord({
        id: crypto.randomUUID(),
        suId,
        homeId: homeId ?? '',
        recordType,
        data: rest as Record<string, any>,
        savedAt: new Date().toISOString(),
      })
      toast('Saved offline — will sync when connected', { icon: '📶' })
      // Return a fake response so callers (which call onSaved()) continue normally
      return { data: { data: null }, status: 200, statusText: 'OK', headers: {}, config: {} as any }
    }
    return api.post('/daily-records', data)
  },
  getDetail: (id: string) => api.get(`/daily-records/${id}/detail`),
  getFluidTotal: (suId: string, date?: string) =>
    api.get('/daily-records/fluid-total', { params: { suId, date } }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/daily-records/${id}`, data),
  delete: (id: string) => api.delete(`/daily-records/${id}`),
}

export function photoUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  const base = (import.meta as any).env?.VITE_API_URL || ''
  return `${base}${url}`
}

export const assessmentsApi = {
  list: (params?: Record<string, unknown>) => api.get('/assessments', { params }),
  get: (id: string) => api.get(`/assessments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/assessments', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/assessments/${id}`, data),
  delete: (id: string) => api.delete(`/assessments/${id}`),
  templates: () => api.get('/assessments/templates'),
  template: (key: string) => api.get(`/assessments/templates/${key}`),
}