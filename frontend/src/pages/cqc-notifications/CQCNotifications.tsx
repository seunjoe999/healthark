import React, { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import api from '../../api'
import { Spinner, EmptyState, Button, Modal, Input, Select } from '../../components/ui'
import { Plus, AlertTriangle, Check, X, Trash2, Paperclip, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

interface CQCNotification {
  id: string
  su_id?: string
  first_name?: string
  last_name?: string
  notification_type: string
  details: string
  status: 'pending' | 'resolved'
  notified_by_name?: string
  notification_date: string
  attachment_url?: string
}

export default function CQCNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<CQCNotification[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<'pending' | 'resolved'>('pending')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModal, setDetailModal] = useState<CQCNotification | null>(null)

  const loadNotifications = useCallback(async () => {
    if (!user?.homeId) return
    setLoading(true)
    try {
      const res = await api.get(`/cqc-notifications?homeId=${user.homeId}&status=${filter}`)
      setNotifications(res.data.data || [])
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [user?.homeId, filter])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    try {
      await api.delete(`/cqc-notifications/${id}`)
      toast.success('Notification deleted')
      loadNotifications()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete')
    }
  }

  const handleResolve = async (id: string) => {
    try {
      await api.patch(`/cqc-notifications/${id}`, { status: 'resolved' })
      toast.success('Notification marked as resolved')
      loadNotifications()
      setDetailModal(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update')
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            CQC Notifications & Safeguarding Alerts
          </h1>
          <p className="text-sm text-slate-500 mt-1">Manage CQC notifications and safeguarding incidents</p>
        </div>
        <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateModalOpen(true)}>New Notification</Button>
      </div>

      {/* ── Filters ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-3 flex gap-2">
        {['pending', 'resolved'].map(f => (
          <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1 text-sm rounded-full font-medium transition-colors ${ filter === f ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Spinner />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState title="No notifications" description="No safeguarding notifications found" action={<Button onClick={() => setCreateModalOpen(true)}>Create Notification</Button>} />
        ) : (
          <div className="p-6 space-y-3">
            {notifications.map(notif => (
              <div key={notif.id} className={`rounded-lg border overflow-hidden hover:shadow-sm transition-shadow cursor-pointer ${ notif.status === 'pending' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`} onClick={() => setDetailModal(notif)}>
                <div className="p-4 flex items-start gap-4">
                  <div className={`flex-shrink-0 rounded p-2 ${ notif.status === 'pending' ? 'bg-red-100' : 'bg-green-100'}`}>
                    {notif.status === 'pending' ? (
                      <AlertTriangle className={`w-5 h-5 ${ notif.status === 'pending' ? 'text-red-600' : 'text-green-600'}`} />
                    ) : (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-slate-800">{notif.notification_type}</p>
                      {notif.first_name && <p className="text-sm text-slate-600">{notif.first_name} {notif.last_name}</p>}
                    </div>
                    <p className="text-sm text-slate-700 mb-2 line-clamp-2">{notif.details}</p>
                    <div className="flex gap-2 text-xs text-slate-500">
                      {notif.notified_by_name && <span>{notif.notified_by_name}</span>}
                      <span>{new Date(notif.notification_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); handleDelete(notif.id); }} className="text-slate-400 hover:text-red-600 transition-colors flex-shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <CreateNotificationModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} homeId={user?.homeId || ''} onSaved={loadNotifications} />
      {detailModal && <NotificationDetailModal notification={detailModal} onClose={() => setDetailModal(null)} onResolve={() => handleResolve(detailModal.id)} />}
    </div>
  )
}

function CreateNotificationModal({ open, onClose, homeId, onSaved }: { open: boolean; onClose: () => void; homeId: string; onSaved: () => void }) {
  const [form, setForm] = useState({ suId: '', notificationType: 'safeguarding', details: '', attachmentUrl: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const fileRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      api.get(`/service-users?homeId=${homeId}&status=live`).then(res => setUsers(res.data.data || []))
    }
  }, [open, homeId])

  const uploadFile = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await api.post('/upload/document', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setForm((p: any) => ({ ...p, attachmentUrl: res.data.data.fileUrl }))
      toast.success('File attached')
    } catch { toast.error('Upload failed') }
    finally { setUploading(false) }
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.notificationType || !form.details) {
      toast.error('Please fill required fields')
      return
    }
    setLoading(true)
    try {
      await api.post('/cqc-notifications', { homeId, ...form })
      toast.success('Notification created')
      setForm({ suId: '', notificationType: 'safeguarding', details: '', attachmentUrl: '' })
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create CQC Notification" size="md">
      <form onSubmit={save} className="space-y-4">
        <Select label="Type *" required value={form.notificationType} onChange={e => setForm((p: any) => ({ ...p, notificationType: e.target.value }))} options={[ { value: 'safeguarding', label: 'Safeguarding Incident' }, { value: 'cqc_alert', label: 'CQC Alert' }, { value: 'serious_incident', label: 'Serious Incident' }, { value: 'complaint', label: 'Complaint' }]} />
        <Select label="Service User (Optional)" value={form.suId} onChange={e => setForm((p: any) => ({ ...p, suId: e.target.value }))} options={users.map(u => ({ value: u.id, label: `${u.first_name} ${u.last_name}` }))} placeholder="Select resident (if applicable)" />
        <div><label className="label">Details *</label><textarea className="input" placeholder="Describe the incident or notification..." rows={4} value={form.details} onChange={e => setForm((p: any) => ({ ...p, details: e.target.value }))} required /></div>
        <div>
          <label className="label">Attachment (optional)</label>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => e.target.files?.[0] && uploadFile(e.target.files[0])} />
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium border border-slate-200 transition-colors">
              <Paperclip className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Attach file'}
            </button>
            {form.attachmentUrl && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> File attached</span>}
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={loading}>Create Notification</Button>
        </div>
      </form>
    </Modal>
  )
}

function NotificationDetailModal({ notification, onClose, onResolve }: { notification: CQCNotification; onClose: () => void; onResolve: () => void }) {
  return (
    <Modal open={true} onClose={onClose} title="Notification Details" size="md">
      <div className="space-y-4">
        <div className="p-3 bg-slate-50 rounded border border-slate-200">
          <p className="text-xs font-semibold text-slate-600 mb-1">Type</p>
          <p className="font-semibold text-slate-800">{notification.notification_type}</p>
        </div>
        {notification.first_name && (
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <p className="text-xs font-semibold text-slate-600 mb-1">Service User</p>
            <p className="font-semibold text-slate-800">{notification.first_name} {notification.last_name}</p>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">Details</p>
          <p className="text-sm text-slate-700 p-3 bg-slate-50 rounded border border-slate-200">{notification.details}</p>
        </div>
        <div className="flex gap-2 text-xs text-slate-500">
          {notification.notified_by_name && <span>By: {notification.notified_by_name}</span>}
          <span>Date: {new Date(notification.notification_date).toLocaleDateString()}</span>
        </div>
        {notification.attachment_url && (
          <a href={notification.attachment_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <Paperclip className="w-4 h-4" /> View attachment <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {notification.status === 'pending' && (
          <div className="flex gap-3 pt-2">
            <button onClick={onResolve} className="flex-1 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded font-medium text-sm transition-colors">Mark Resolved</button>
          </div>
        )}
        <div className="flex gap-3 justify-end pt-2 border-t">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
