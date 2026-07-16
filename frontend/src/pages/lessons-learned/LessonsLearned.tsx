import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Plus, TrendingUp, CheckSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';

interface Lesson {
  id: number;
  title: string;
  incident_type: string;
  date_of_incident: string;
  description: string;
  root_cause: string;
  lesson_learned: string;
  action_taken: string;
  action_owner: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'high' | 'medium' | 'low';
  created_at: string;
  created_by_name: string;
}

interface Stats { total: number; open: number; in_progress: number; closed: number; }

const INCIDENT_TYPES = ['Fall', 'Medication Error', 'Safeguarding', 'Complaint', 'Near Miss', 'Infection', 'Equipment Failure', 'Staffing', 'Clinical', 'Environmental', 'Other'];

export default function LessonsLearned() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, open: 0, in_progress: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [form, setForm] = useState({ title: '', incident_type: 'Fall', date_of_incident: '', description: '', root_cause: '', lesson_learned: '', action_taken: '', action_owner: '', priority: 'medium' });

  const fetchData = async () => {
    try {
      const [lRes, sRes] = await Promise.all([
        api.get(`/lessons-learned${filterStatus ? `?status=${filterStatus}` : ''}`),
        api.get('/lessons-learned/stats'),
      ]);
      setLessons(lRes.data);
      setStats(sRes.data);
    } catch { toast.error('Failed to load lessons'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/lessons-learned', form);
      toast.success('Lesson recorded');
      setShowForm(false);
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/lessons-learned/${id}`, { status });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  const priorityBadge = (p: string) => {
    const cls = p === 'high' ? 'bg-red-500/20 text-red-400' : p === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400';
    return <span className={`px-2 py-0.5 rounded text-xs capitalize ${cls}`}>{p}</span>;
  };

  const statusBadge = (s: string) => {
    const cls = s === 'open' ? 'text-red-400' : s === 'in_progress' ? 'text-yellow-400' : 'text-green-400';
    return <span className={`text-xs capitalize ${cls}`}>{s.replace('_', ' ')}</span>;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <BookOpen size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Lessons Learned</h1>
            <p className="text-sm text-gray-400">Incident analysis & continuous improvement</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Add Lesson
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'Open', value: stats.open, color: 'text-red-400' },
          { label: 'In Progress', value: stats.in_progress, color: 'text-yellow-400' },
          { label: 'Closed', value: stats.closed, color: 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[['', 'All'], ['open', 'Open'], ['in_progress', 'In Progress'], ['closed', 'Closed']].map(([v, l]) => (
          <button key={v} onClick={() => setFilterStatus(v)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filterStatus === v ? 'text-white' : 'text-gray-400'}`}
            style={{ background: filterStatus === v ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>{l}</button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">Record Lesson Learned</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Title</label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                placeholder="Brief summary of the lesson" className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Incident Type</label>
              <select value={form.incident_type} onChange={e => setForm(p => ({ ...p, incident_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {INCIDENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Date of Incident</label>
              <input type="date" value={form.date_of_incident} onChange={e => setForm(p => ({ ...p, date_of_incident: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            {[
              { key: 'description', label: 'What Happened', rows: 2 },
              { key: 'root_cause', label: 'Root Cause Analysis', rows: 2 },
              { key: 'lesson_learned', label: 'Lesson Learned', rows: 2 },
              { key: 'action_taken', label: 'Action Taken / Plan', rows: 2 },
            ].map(f => (
              <div key={f.key} className="md:col-span-2">
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={f.rows}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Action Owner</label>
              <input value={form.action_owner} onChange={e => setForm(p => ({ ...p, action_owner: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#e8b130' }}>Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Lessons list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : lessons.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No lessons recorded</div>
      ) : (
        <div className="space-y-3">
          {lessons.map(l => (
            <div key={l.id} className="rounded-xl overflow-hidden" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-medium text-sm">{l.title}</span>
                      {priorityBadge(l.priority)}
                      {statusBadge(l.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      <span>{l.incident_type}</span>
                      <span>{format(new Date(l.date_of_incident), 'dd MMM yyyy')}</span>
                      <span>{l.created_by_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {l.status !== 'closed' && (
                      <button onClick={e => { e.stopPropagation(); updateStatus(l.id, l.status === 'open' ? 'in_progress' : 'closed'); }}
                        className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10">
                        <CheckSquare size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {expanded === l.id && (
                <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  {l.description && <div className="pt-3"><div className="text-xs text-gray-500 mb-1">What Happened</div><p className="text-sm text-gray-300">{l.description}</p></div>}
                  {l.root_cause && <div><div className="text-xs text-gray-500 mb-1">Root Cause</div><p className="text-sm text-gray-300">{l.root_cause}</p></div>}
                  {l.lesson_learned && <div><div className="text-xs text-gray-500 mb-1">Lesson Learned</div><p className="text-sm text-gray-300">{l.lesson_learned}</p></div>}
                  {l.action_taken && <div><div className="text-xs text-gray-500 mb-1">Action Taken</div><p className="text-sm text-gray-300">{l.action_taken}</p></div>}
                  {l.action_owner && <div className="text-xs text-gray-400">Owner: {l.action_owner}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
