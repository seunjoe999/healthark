import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = (window as any).__HA_TOKEN__
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      (window as any).__HA_TOKEN__ = null
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
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
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
  addContact: (id: string, data: Record<string, unknown>) =>
    api.post(`/service-users/${id}/contacts`, data),
  updateContact: (id: string, contactId: string, data: Record<string, unknown>) =>
    api.put(`/service-users/${id}/contacts/${contactId}`, data),
  deleteContact: (id: string, contactId: string) =>
    api.delete(`/service-users/${id}/contacts/${contactId}`),
  getDocuments: (id: string) => api.get(`/service-users/${id}/documents`),
  getMessages: (id: string) => api.get(`/service-users/${id}/messages`),
  sendMessage: (id: string, data: Record<string, unknown>) =>
    api.post(`/service-users/${id}/messages`, data),
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
  list: (homeId: string, resolved = false) =>
    api.get('/alerts', { params: { homeId, resolved } }),
  resolve: (id: string, notes?: string) =>
    api.put(`/alerts/${id}/resolve`, { resolutionNotes: notes }),
}
