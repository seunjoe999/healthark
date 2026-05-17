import axios from 'axios'

function getToken(): string | null {
  if ((window as any).__HA_TOKEN__) return (window as any).__HA_TOKEN__
  try { const t = sessionStorage.getItem('ha_token'); if (t) return t } catch {}
  try { const t = localStorage.getItem('ha_token'); if (t) return t } catch {}
  return null
}

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      ;(window as any).__HA_TOKEN__ = null
      try { sessionStorage.removeItem('ha_token') } catch {}
      try { localStorage.removeItem('ha_token') } catch {}
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
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
}

export const alertsApi = {
  list: (homeId: string, resolved = false) => api.get('/alerts', { params: { homeId, resolved } }),
  resolve: (id: string, notes?: string) => api.put(`/alerts/${id}/resolve`, { resolutionNotes: notes }),
}

export const dailyRecordsApi = {
  list: (suId: string, date?: string, recordType?: string) =>
    api.get('/daily-records', { params: { suId, date, recordType } }),
  create: (data: Record<string, unknown>) => api.post('/daily-records', data),
  getDetail: (id: string) => api.get(`/daily-records/${id}/detail`),
  getFluidTotal: (suId: string, date?: string) =>
    api.get('/daily-records/fluid-total', { params: { suId, date } }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/daily-records/${id}`, data),
  delete: (id: string) => api.delete(`/daily-records/${id}`),
}

export const assessmentsApi = {
  list: (params?: Record<string, string>) => api.get('/assessments', { params }),
  get: (id: string) => api.get(`/assessments/${id}`),
  create: (data: Record<string, unknown>) => api.post('/assessments', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/assessments/${id}`, data),
  templates: () => api.get('/assessments/templates'),
  template: (key: string) => api.get(`/assessments/templates/${key}`),
}

// Helper — converts relative upload paths to full backend URL
export function photoUrl(url?: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `http://localhost:3001${url}`
}
