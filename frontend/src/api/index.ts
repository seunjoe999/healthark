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
export const API_BASE = isNative ? 'https://compcarehub.co.uk/api' : '/api'
const UPLOADS_ORIGIN = isNative ? 'https://compcarehub.co.uk' : ''

// Every uploaded file (documents, photos) is stored as a site-relative path
// like "/uploads/docs/xxx.pdf". On web that resolves fine against the page's
// own origin. Inside the Capacitor native shell the webview's origin is NOT
// compcarehub.co.uk, so the same relative href/src silently 404s — this is
// why attachments "don't open" and photos may not load on the mobile app.
// Wrap any uploaded-file URL with this before using it in href/src.
export function resolveUploadUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  return `${UPLOADS_ORIGIN}${url}`
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// Deletion is locked org-wide until a super_admin role is created — the
// backend enforces this for real (index.ts's global delete lockdown), this
// is just an early, clearer client-side message. It must check the current
// session's own role rather than blocking every DELETE unconditionally —
// once a super_admin account exists and is logged in, deletion should work.
function currentStaffRole(): string {
  try {
    const t = getToken()
    if (!t) return ''
    const payload = JSON.parse(atob(t.split('.')[1] || ''))
    return payload?.role || ''
  } catch { return '' }
}

api.interceptors.request.use((config) => {
  if ((config.method || '').toLowerCase() === 'delete' && currentStaffRole() !== 'super_admin') {
    toast.error('Deletion is currently locked for all accounts until a super admin role is set up.')
    return Promise.reject(new Error('Deletion locked'))
  }
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Retry transient failures (backend restarting mid-deploy, brief network blip)
// a couple of times with a short delay, so a passing 502/"failed to fetch"
// doesn't force the user to manually refresh the page.
const MAX_RETRIES = 2
function isTransient(err: any): boolean {
  if (!err.response) return true // network error / "failed to fetch" / timeout
  return [502, 503, 504].includes(err.response.status)
}

// NEVER redirect on 401 - let components handle their own auth errors
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const config = err.config
    if (config && isTransient(err) && config.method !== 'post' && config.method !== 'put' && config.method !== 'patch' && config.method !== 'delete') {
      config.__retryCount = config.__retryCount || 0
      if (config.__retryCount < MAX_RETRIES) {
        config.__retryCount++
        await sleep(600 * config.__retryCount)
        return api(config)
      }
    }
    return Promise.reject(err)
  }
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

function byResidentName(a: any, b: any) {
  const nameOf = (su: any) => `${su.first_name || ''} ${su.last_name || ''}`.trim()
  return nameOf(a).localeCompare(nameOf(b))
}

export const suApi = {
  // Sorted alphabetically by name here so every page that lists or picks a
  // resident (Support Plans, Risk Assessments, Outcomes, PEEP, etc.) gets a
  // consistent order without each page having to sort it independently.
  list: (homeId: string, params?: Record<string, string>) =>
    api.get('/service-users', { params: { homeId, ...params } })
      .then(res => { res.data.data = (res.data.data || []).slice().sort(byResidentName); return res }),
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