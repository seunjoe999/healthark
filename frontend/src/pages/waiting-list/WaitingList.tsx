import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { List, Plus, Phone, Clock, CheckCircle, XCircle, RefreshCw, Search } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

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
  address: string | null;
  assessment_date: string | null;
  assessment_conducted_by: string | null;
  outcome: string | null;
  next_action: string | null;
  final_outcome: string | null;
}

interface Stats { total: number; waiting: number; high_priority: number; avg_wait_days: number; }

const PRIORITIES = ['urgent', 'high', 'standard', 'low'];
const STATUSES = ['enquiry', 'assessment_booked', 'assessment_complete', 'offer_made', 'accepted', 'declined', 'withdrawn'];
const STATUS_LABELS: Record<string, string> = {
  enquiry: 'Enquiry',
  assessment_booked: 'Assessment Booked',
  assessment_complete: 'Assessment Done',
  offer_made: 'Offer Made',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
};

// Solid, high-contrast permanent colors for every status tab — ZERO greyed-out tabs
const STATUS_SOLID_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  all: { bg: '#e8b130', text: '#0f172a', border: '#b45309' },
  enquiry: { bg: '#fde047', text: '#0f172a', border: '#ca8a04' },
  assessment_booked: { bg: '#38bdf8', text: '#0f172a', border: '#0284c7' },
  assessment_complete: { bg: '#a78bfa', text: '#0f172a', border: '#7c3aed' },
  offer_made: { bg: '#fb923c', text: '#0f172a', border: '#ea580c' },
  accepted: { bg: '#4ade80', text: '#0f172a', border: '#16a34a' },
  declined: { bg: '#f87171', text: '#0f172a', border: '#dc2626' },
  withdrawn: { bg: '#cbd5e1', text: '#0f172a', border: '#64748b' },
};

export default function WaitingList() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const tileBg = theme === 'dark' ? '#111111' : '#ffffff';
  const tileBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.1)';
  const inputBg = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc';
  const inputBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.14)';
  const btnGhostBg = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const neutralText = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const inputText = theme === 'dark' ? 'text-white' : 'text-slate-900';

  const [entries, setEntries] = useState<WaitingEntry[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, waiting: 0, high_priority: 0, avg_wait_days: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', contact_name: '', contact_phone: '', contact_email: '', care_needs: '', priority: 'standard', notes: '',
    address: '', assessment_date: '', assessment_conducted_by: '', outcome: '', next_action: '', final_outcome: '',
  });

  const fetchData = async () => {
    try {
      const hParams = user?.homeId ? { homeId: user.homeId } : {};
      const [listRes, statsRes] = await Promise.all([
        api.get('/waiting-list', { params: filterStatus ? { status: filterStatus, ...hParams } : { ...hParams } }),
        api.get('/waiting-list/stats', { params: hParams }),
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

  const visibleEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      String(e.full_name || '').toLowerCase().includes(q) ||
      String(e.contact_name || '').toLowerCase().includes(q) ||
      String(e.contact_phone || '').toLowerCase().includes(q) ||
      String(e.care_needs || '').toLowerCase().includes(q)
    );
  }, [entries, search]);

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
        address: form.address || undefined,
        assessmentDate: form.assessment_date || undefined,
        assessmentConductedBy: form.assessment_conducted_by || undefined,
        outcome: form.outcome || undefined,
        nextAction: form.next_action || undefined,
        finalOutcome: form.final_outcome || undefined,
      });
      toast.success('Added to waiting list');
      setShowForm(false);
      setForm({
        full_name: '', date_of_birth: '', contact_name: '', contact_phone: '', contact_email: '', care_needs: '', priority: 'standard', notes: '',
        address: '', assessment_date: '', assessment_conducted_by: '', outcome: '', next_action: '', final_outcome: '',
      });
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

  const priorityBadge = (p: string) => {
    const styleMap: Record<string, { bg: string; color: string }> = {
      urgent: { bg: '#ef4444', color: '#ffffff' },
      high: { bg: '#fb923c', color: '#0f172a' },
      standard: { bg: '#fde047', color: '#0f172a' },
      low: { bg: '#4ade80', color: '#0f172a' },
    };
    const st = styleMap[p] || styleMap.standard;
    return (
      <span
        className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold capitalize"
        style={{ background: st.bg, color: st.color }}
      >
        {p}
      </span>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#e8b130' }}>
            <List size={20} style={{ color: '#0f172a' }} />
          </div>
          <div>
            <h1 className={`text-2xl font-extrabold ${neutralText}`}>Waiting List</h1>
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              Prospective residents &amp; referrals
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl font-bold"
            style={{ background: '#e8b130', color: '#0f172a' }}
            title="Refresh list"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold shadow-sm"
            style={{ background: '#e8b130', color: '#0f172a' }}
          >
            <Plus size={16} /> Add to List
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Referrals', value: stats.total, color: neutralText },
          { label: 'Waiting / Booked', value: stats.waiting, color: 'text-sky-500' },
          { label: 'High Priority', value: stats.high_priority, color: 'text-rose-500' },
          { label: 'Avg Wait', value: `${Math.round(stats.avg_wait_days || 0)}d`, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: tileBg, border: tileBorder }}>
            <div className={`text-2xl font-extrabold ${s.color}`}>{s.value}</div>
            <div className={`text-xs font-bold uppercase tracking-wide mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Search input */}
      <div className="relative max-w-md">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search prospective resident, contact name, phone..."
          className={`w-full pl-10 pr-3 py-2 rounded-xl ${inputText} text-sm font-medium`}
          style={{ background: inputBg, border: inputBorder }}
        />
      </div>

      {/* Permanent, high-contrast solid status tabs — ZERO greyed-out headings */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setFilterStatus('')}
          className="px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide shadow-sm transition-all"
          style={{
            background: STATUS_SOLID_STYLES.all.bg,
            color: STATUS_SOLID_STYLES.all.text,
            border: filterStatus === '' ? '3px solid #0f172a' : `1.5px solid ${STATUS_SOLID_STYLES.all.border}`,
            transform: filterStatus === '' ? 'scale(1.04)' : undefined,
          }}
        >
          All
        </button>
        {STATUSES.map(s => {
          const st = STATUS_SOLID_STYLES[s] || STATUS_SOLID_STYLES.all;
          const isSelected = filterStatus === s;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide shadow-sm transition-all"
              style={{
                background: st.bg,
                color: st.text,
                border: isSelected ? '3px solid #0f172a' : `1.5px solid ${st.border}`,
                transform: isSelected ? 'scale(1.04)' : undefined,
              }}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: tileBg, border: tileBorder }}>
          <h3 className={`${neutralText} text-base font-extrabold`}>Add to Waiting List</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Full Name *', key: 'full_name', type: 'text', required: true },
              { label: 'Date of Birth', key: 'date_of_birth', type: 'date', required: false },
              { label: 'Contact Name', key: 'contact_name', type: 'text', required: false },
              { label: 'Contact Phone', key: 'contact_phone', type: 'tel', required: false },
              { label: 'Contact Email', key: 'contact_email', type: 'email', required: false },
              { label: 'Address', key: 'address', type: 'text', required: false },
              { label: 'Date of Assessment', key: 'assessment_date', type: 'date', required: false },
              { label: 'Who Conducted the Assessment', key: 'assessment_conducted_by', type: 'text', required: false },
            ].map(f => (
              <div key={f.key}>
                <label className={`text-xs font-bold mb-1 block ${neutralText}`}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} required={f.required}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg ${inputText} text-sm`} style={{ background: inputBg, border: inputBorder }} />
              </div>
            ))}
            <div>
              <label className={`text-xs font-bold mb-1 block ${neutralText}`}>Priority</label>
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg ${inputText} text-sm capitalize font-semibold`} style={{ background: inputBg, border: inputBorder }}>
                {PRIORITIES.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={`text-xs font-bold mb-1 block ${neutralText}`}>Care Needs Summary</label>
              <textarea value={form.care_needs} onChange={e => setForm(p => ({ ...p, care_needs: e.target.value }))} rows={2}
                className={`w-full px-3 py-2 rounded-lg ${inputText} text-sm resize-none`} style={{ background: inputBg, border: inputBorder }} />
            </div>
            {[
              { label: 'Outcome', key: 'outcome' },
              { label: 'Next Action', key: 'next_action' },
              { label: 'Final Outcome', key: 'final_outcome' },
            ].map(f => (
              <div key={f.key} className="md:col-span-2">
                <label className={`text-xs font-bold mb-1 block ${neutralText}`}>{f.label}</label>
                <textarea value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2}
                  className={`w-full px-3 py-2 rounded-lg ${inputText} text-sm resize-none`} style={{ background: inputBg, border: inputBorder }} />
              </div>
            ))}
            <div className="md:col-span-2">
              <label className={`text-xs font-bold mb-1 block ${neutralText}`}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className={`w-full px-3 py-2 rounded-lg ${inputText} text-sm resize-none`} style={{ background: inputBg, border: inputBorder }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-extrabold" style={{ background: '#e8b130', color: '#0f172a' }}>Save Entry</button>
              <button type="button" onClick={() => setShowForm(false)} className={`px-4 py-2 rounded-lg text-sm font-bold ${neutralText}`} style={{ background: btnGhostBg }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Entries */}
      {loading ? (
        <div className={`text-center font-semibold py-12 ${neutralText}`}>Loading...</div>
      ) : visibleEntries.length === 0 ? (
        <div className={`text-center font-semibold py-12 ${neutralText}`}>No entries on waiting list</div>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map(entry => {
            const st = STATUS_SOLID_STYLES[entry.status] || STATUS_SOLID_STYLES.all;
            return (
              <div key={entry.id} className="p-4 rounded-xl" style={{ background: tileBg, border: tileBorder }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`${neutralText} font-extrabold text-base`}>{entry.full_name}</span>
                      {priorityBadge(entry.priority)}
                      <span
                        className="text-xs px-2.5 py-0.5 rounded-lg font-extrabold"
                        style={{ background: st.bg, color: st.text }}
                      >
                        {STATUS_LABELS[entry.status] || entry.status}
                      </span>
                    </div>
                    {entry.care_needs && (
                      <div className={`text-xs font-medium mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                        {entry.care_needs}
                      </div>
                    )}
                    <div className={`flex flex-wrap gap-3 mt-2 text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                      {entry.contact_name && <span>Contact: {entry.contact_name}</span>}
                      {entry.contact_phone && (
                        <a href={`tel:${entry.contact_phone}`} className="flex items-center gap-1 font-bold text-blue-500 hover:underline">
                          <Phone size={11} />{entry.contact_phone}
                        </a>
                      )}
                      {entry.enquiry_date && (
                        <span className="flex items-center gap-1">
                          <Clock size={11} />Enquired {format(new Date(entry.enquiry_date), 'dd MMM yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {entry.status === 'enquiry' && (
                      <button
                        onClick={() => updateStatus(entry.id, 'assessment_booked')}
                        className="text-xs px-3 py-1.5 rounded-lg font-extrabold shadow-sm"
                        style={{ background: '#38bdf8', color: '#0f172a' }}
                      >
                        Book Assessment
                      </button>
                    )}
                    {entry.status === 'assessment_booked' && (
                      <button
                        onClick={() => updateStatus(entry.id, 'accepted')}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-extrabold shadow-sm"
                        style={{ background: '#4ade80', color: '#0f172a' }}
                      >
                        <CheckCircle size={12} /> Admit
                      </button>
                    )}
                    {['enquiry', 'assessment_booked', 'offer_made'].includes(entry.status) && (
                      <button
                        onClick={() => updateStatus(entry.id, 'withdrawn')}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-bold"
                        style={{ background: '#fca5a5', color: '#0f172a' }}
                      >
                        <XCircle size={12} /> Withdraw
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
