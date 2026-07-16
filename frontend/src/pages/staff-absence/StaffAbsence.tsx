import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { UserX, Plus, TrendingUp, Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';

interface Absence {
  id: number;
  staff_name: string;
  start_date: string;
  end_date: string | null;
  reason: string;
  absence_type: string;
  is_fit_for_work: boolean;
  return_date: string | null;
  notes: string;
}

interface Bradford { staff_id: number; staff_name: string; bradford_score: number; spells: number; total_days: number; }
interface Stats { total_absences: number; active_absences: number; total_days: number; avg_days: number; }

const ABSENCE_TYPES = ['Sickness', 'Unauthorised', 'Authorised', 'Holiday', 'Compassionate', 'Maternity/Paternity', 'Other'];
const REASONS = ['Illness', 'Injury', 'Mental Health', 'Family Emergency', 'Bereavement', 'Medical Appointment', 'Unknown', 'Other'];

export default function StaffAbsence() {
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [bradford, setBradford] = useState<Bradford[]>([]);
  const [stats, setStats] = useState<Stats>({ total_absences: 0, active_absences: 0, total_days: 0, avg_days: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'absences' | 'bradford'>('absences');
  const [form, setForm] = useState({ staff_id: '', start_date: '', end_date: '', reason: 'Illness', absence_type: 'Sickness', notes: '' });
  const [staffList, setStaffList] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  const fetchData = async () => {
    try {
      const [absRes, bfRes, statsRes, staffRes] = await Promise.all([
        api.get('/staff-absence'),
        api.get('/staff-absence/bradford'),
        api.get('/staff-absence/stats'),
        api.get('/staff', { params: { status: 'active' } }),
      ]);
      setAbsences(absRes.data.data || []);
      setBradford(bfRes.data.data || []);
      const sd = statsRes.data.data || {};
      setStats({
        total_absences: Number(sd.currently_absent ?? 0),
        active_absences: Number(sd.currently_absent ?? 0),
        total_days: Number(sd.days_lost_this_month ?? 0),
        avg_days: 0,
      });
      setStaffList(staffRes.data.data || []);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/staff-absence', {
        staffId: form.staff_id,
        absenceStart: form.start_date,
        absenceEnd: form.end_date || undefined,
        absenceType: form.absence_type.toLowerCase().replace(/[^a-z]/g, '_').replace(/\//g, '_'),
        reason: form.reason,
      });
      toast.success('Absence recorded');
      setShowForm(false);
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const bradfordColor = (score: number) => {
    if (score >= 400) return 'text-red-400';
    if (score >= 200) return 'text-orange-400';
    if (score >= 100) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <UserX size={20} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Staff Absence</h1>
            <p className="text-sm text-gray-400">Absence tracking & Bradford Factor scoring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Record Absence
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Absences', value: stats.total_absences, icon: UserX, color: 'text-red-400' },
          { label: 'Currently Absent', value: stats.active_absences, icon: AlertCircle, color: 'text-orange-400' },
          { label: 'Total Days Lost', value: stats.total_days, icon: Calendar, color: 'text-yellow-400' },
          { label: 'Avg Duration', value: `${(stats.avg_days || 0).toFixed(1)}d`, icon: TrendingUp, color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['absences', 'bradford'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'text-white' : 'text-gray-400'}`}
            style={{ background: tab === t ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>
            {t === 'bradford' ? 'Bradford Factor' : 'Absences'}
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">Record Absence</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Staff Member</label>
              <select value={form.staff_id} onChange={e => setForm(p => ({ ...p, staff_id: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">Select staff...</option>
                {staffList.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Absence Type</label>
              <select value={form.absence_type} onChange={e => setForm(p => ({ ...p, absence_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {ABSENCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Start Date</label>
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">End Date (leave blank if ongoing)</label>
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reason</label>
              <select value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#e8b130' }}>Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : tab === 'absences' ? (
        <div className="space-y-2">
          {absences.length === 0 ? <div className="text-center text-gray-400 py-12">No absences recorded</div> : absences.map(a => (
            <div key={a.id} className="p-4 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white font-medium text-sm">{a.staff_name}</span>
                  <span className="ml-2 px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>{a.absence_type}</span>
                </div>
                {!a.end_date && <span className="text-xs text-orange-400">Ongoing</span>}
              </div>
              <div className="mt-1 flex gap-4 text-xs text-gray-400">
                <span>{format(new Date(a.start_date), 'dd MMM yyyy')} {a.end_date ? `→ ${format(new Date(a.end_date), 'dd MMM yyyy')}` : '→ present'}</span>
                <span>{a.reason}</span>
              </div>
              {a.notes && <p className="mt-1 text-xs text-gray-500">{a.notes}</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-4 mb-3 text-xs text-gray-500">
            <span className="text-green-400">● &lt;100 Low</span>
            <span className="text-yellow-400">● 100-199 Medium</span>
            <span className="text-orange-400">● 200-399 High</span>
            <span className="text-red-400">● 400+ Critical</span>
          </div>
          {bradford.length === 0 ? <div className="text-center text-gray-400 py-12">No Bradford data available</div> : bradford.map(b => (
            <div key={b.staff_id} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{b.staff_name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{b.spells} spell{b.spells !== 1 ? 's' : ''} · {b.total_days} days (last 52 weeks)</div>
              </div>
              <div className={`text-2xl font-bold ${bradfordColor(b.bradford_score)}`}>{b.bradford_score}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
