import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { List, Plus, Phone, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';

interface WaitingEntry {
  id: number;
  full_name: string;
  date_of_birth: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  care_needs: string;
  priority: 'urgent' | 'high' | 'standard' | 'low';
  status: 'enquiry' | 'assessment_booked' | 'assessment_complete' | 'offer_made' | 'accepted' | 'declined' | 'withdrawn';
  enquiry_date: string;
  notes: string;
}

interface Stats { total: number; waiting: number; high_priority: number; avg_wait_days: number; }

const PRIORITIES = ['urgent', 'high', 'standard', 'low'];
const STATUSES = ['enquiry', 'assessment_booked', 'assessment_complete', 'offer_made', 'accepted', 'declined', 'withdrawn'];
const STATUS_LABELS: Record<string, string> = {
  enquiry: 'Enquiry', assessment_booked: 'Assessment Booked', assessment_complete: 'Assessment Done',
  offer_made: 'Offer Made', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn',
};

export default function WaitingList() {
  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, waiting: 0, high_priority: 0, avg_wait_days: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm] = useState({ full_name: '', date_of_birth: '', contact_name: '', contact_phone: '', contact_email: '', care_needs: '', priority: 'standard', notes: '' });

  const fetchData = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        api.get('/waiting-list', { params: filterStatus ? { status: filterStatus } : {} }),
        api.get('/waiting-list/stats'),
      ]);
      setEntries(listRes.data.data || []);
      const sd = statsRes.data.data || {};
      setStats({
        total: Number(sd.total ?? 0),
        waiting: Number(sd.byStatus?.enquiry ?? 0) + Number(sd.byStatus?.assessment_booked ?? 0),
        high_priority: Number(sd.byPriority?.high ?? 0) + Number(sd.byPriority?.urgent ?? 0),
        avg_wait_days: 0,
      });
    } catch { toast.error('Failed to load waiting list'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/waiting-list', {
        fullName: form.full_name,
        dateOfBirth: form.date_of_birth || undefined,
        contactName: form.contact_name || undefined,
        contactPhone: form.contact_phone || undefined,
        contactEmail: form.contact_email || undefined,
        careNeeds: form.care_needs || undefined,
        priority: form.priority,
        notes: form.notes || undefined,
      });
      toast.success('Added to waiting list');
      setShowForm(false);
      setForm({ full_name: '', date_of_birth: '', contact_name: '', contact_phone: '', contact_email: '', care_needs: '', priority: 'standard', notes: '' });
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/waiting-list/${id}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  // Map backend status values to display-friendly ones
  const statusLabel = (s: string) => {
    const map: Record<string, string> = { enquiry: 'waiting', assessment_booked: 'offered', accepted: 'admitted', declined: 'declined', withdrawn: 'withdrawn' };
    return map[s] || s;
  };

  const priorityBadge = (p: string) => {
    const cls = p === 'urgent' ? 'bg-rose-500/20 text-rose-400' : p === 'high' ? 'bg-red-500/20 text-red-400' : p === 'standard' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400';
    return <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>{p}</span>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.15)' }}>
            <List size={20} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Waiting List</h1>
            <p className="text-sm text-gray-400">Prospective residents & referrals</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Add to List
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Waiting', value: stats.waiting, color: 'text-blue-400' },
          { label: 'High Priority', value: stats.high_priority, color: 'text-red-400' },
          { label: 'Avg Wait', value: `${Math.round(stats.avg_wait_days || 0)}d`, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterStatus('')}
          className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === '' ? 'text-white' : 'text-gray-400'}`}
          style={{ background: filterStatus === '' ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>All</button>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === s ? 'text-white' : 'text-gray-400'}`}
            style={{ background: filterStatus === s ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>{STATUS_LABELS[s]}</button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">Add to Waiting List</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Full Name', key: 'full_name', type: 'text', required: true },
              { label: 'Date of Birth', key: 'date_of_birth', type: 'date', required: false },
              { label: 'Contact Name', key: 'contact_name', type: 'text', required: false },
              { label: 'Contact Phone', key: 'contact_phone', type: 'tel', required: false },
              { label: 'Contact Email', key: 'contact_email', type: 'email', required: false },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} required={f.required}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Care Needs Summary</label>
              <textarea value={form.care_needs} onChange={e => setForm(p => ({ ...p, care_needs: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg text-white text-sm resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#e8b130' }}>Add</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No entries found</div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="p-4 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{e.full_name}</span>
                    {priorityBadge(e.priority)}
                    <span className="text-xs text-gray-500">{STATUS_LABELS[e.status] || e.status}</span>
                  </div>
                  {e.date_of_birth && <div className="text-xs text-gray-400 mt-1">DOB: {format(new Date(e.date_of_birth + 'T12:00:00'), 'dd MMM yyyy')}</div>}
                  {e.care_needs && <div className="text-xs text-gray-500 mt-1">{e.care_needs}</div>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                    {e.contact_name && <span>{e.contact_name}</span>}
                    {e.contact_phone && <span className="flex items-center gap-1"><Phone size={10} />{e.contact_phone}</span>}
                    {e.enquiry_date && <span className="flex items-center gap-1"><Clock size={10} />{format(new Date(e.enquiry_date + 'T12:00:00'), 'dd MMM yyyy')}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {e.status === 'enquiry' && (
                    <>
                      <button onClick={() => updateStatus(e.id, 'assessment_booked')} title="Book assessment"
                        className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-400/10"><CheckCircle size={14} /></button>
                      <button onClick={() => updateStatus(e.id, 'withdrawn')} title="Mark as withdrawn"
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10"><XCircle size={14} /></button>
                    </>
                  )}
                  {e.status === 'assessment_complete' && (
                    <button onClick={() => updateStatus(e.id, 'offer_made')} title="Make offer"
                      className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><CheckCircle size={14} /></button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
