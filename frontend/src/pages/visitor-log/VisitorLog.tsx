import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Plus, LogOut, Clock, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

interface Visit {
  id: string;
  visitor_name: string;
  resident_name: string | null;
  purpose: string;
  sign_in_time: string;
  sign_out_time: string | null;
  vehicle_reg: string | null;
  visitor_phone: string | null;
  notes: string | null;
}

interface CurrentlyIn { visitor_name: string; sign_in_time: string; purpose: string; resident_name: string | null; }

export default function VisitorLog() {
  const { user } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [currentlyIn, setCurrentlyIn] = useState<CurrentlyIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [form, setForm] = useState({ visitor_name: '', resident_visited: '', purpose: 'social_visit', phone: '', vehicle_reg: '', notes: '' });
  const [residents, setResidents] = useState<{ id: string; first_name: string; last_name: string }[]>([]);

  const fetchData = async () => {
    try {
      const hId = user?.homeId || '';
      const [visitsRes, currentRes, resRes] = await Promise.all([
        api.get('/visitor-log', { params: { date, homeId: hId } }),
        api.get('/visitor-log/currently-in', { params: { homeId: hId } }),
        api.get('/service-users', { params: { status: 'live', homeId: hId } }),
      ]);
      setVisits(visitsRes.data.data || []);
      setCurrentlyIn(currentRes.data.data || []);
      setResidents(resRes.data.data || []);
    } catch { toast.error('Failed to load visitor log'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [date]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/visitor-log', {
        visitorName: form.visitor_name,
        suId: form.resident_visited || undefined,
        purpose: 'social_visit',
        visitorPhone: form.phone || undefined,
        vehicleReg: form.vehicle_reg || undefined,
        notes: form.notes || undefined,
      });
      toast.success('Visitor signed in');
      setShowForm(false);
      setForm({ visitor_name: '', resident_visited: '', purpose: 'social_visit', phone: '', vehicle_reg: '', notes: '' });
      fetchData();
    } catch { toast.error('Failed to sign in visitor'); }
  };

  const handleSignOut = async (id: string) => {
    try {
      await api.put(`/visitor-log/${id}/signout`);
      toast.success('Visitor signed out');
      fetchData();
    } catch { toast.error('Failed to sign out'); }
  };

  const PURPOSES = [
    { value: 'social_visit', label: 'Social / Family Visit' },
    { value: 'professional', label: 'Healthcare Professional' },
    { value: 'contractor', label: 'Contractor' },
    { value: 'delivery', label: 'Delivery' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.15)' }}>
            <Users size={20} className="text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Visitor Log</h1>
            <p className="text-sm text-gray-400">Sign in/out & visitor tracking</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Sign In Visitor
          </button>
        </div>
      </div>

      {/* Currently in */}
      {currentlyIn.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Eye size={14} className="text-green-400" />
            <span className="text-green-400 text-sm font-medium">{currentlyIn.length} visitor{currentlyIn.length !== 1 ? 's' : ''} currently on site</span>
          </div>
          <div className="space-y-1">
            {currentlyIn.map((v, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-white">{v.visitor_name}</span>
                {v.resident_name && <span className="text-gray-400">visiting {v.resident_name}</span>}
                <span className="text-gray-500 text-xs">{format(new Date(v.sign_in_time), 'HH:mm')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign in form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">Sign In Visitor</h3>
          <form onSubmit={handleSignIn} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Visitor Name</label>
              <input value={form.visitor_name} onChange={e => setForm(p => ({ ...p, visitor_name: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Resident Being Visited</label>
              <select value={form.resident_visited} onChange={e => setForm(p => ({ ...p, resident_visited: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option value="">Not visiting a resident</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.first_name} {r.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Purpose</label>
              <select value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {PURPOSES.map(pu => <option key={pu.value} value={pu.value}>{pu.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Vehicle Registration</label>
              <input value={form.vehicle_reg} onChange={e => setForm(p => ({ ...p, vehicle_reg: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#e8b130' }}>Sign In</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Date picker & log */}
      <div className="flex items-center gap-3">
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <span className="text-gray-400 text-sm">{visits.length} visit{visits.length !== 1 ? 's' : ''}</span>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : visits.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No visitors recorded for this date</div>
      ) : (
        <div className="space-y-2">
          {visits.map(v => (
            <div key={v.id} className="p-4 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{v.visitor_name}</span>
                    {v.resident_name && <span className="text-gray-400 text-xs">→ {v.resident_name}</span>}
                    <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{v.purpose}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Clock size={10} />In: {format(new Date(v.sign_in_time), 'HH:mm')}</span>
                    {v.sign_out_time && <span>Out: {format(new Date(v.sign_out_time), 'HH:mm')}</span>}
                    {v.visitor_phone && <span>{v.visitor_phone}</span>}
                    {v.vehicle_reg && <span>{v.vehicle_reg}</span>}
                  </div>
                </div>
                {!v.sign_out_time && (
                  <button onClick={() => handleSignOut(v.id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-red-400 hover:bg-red-400/10"
                    style={{ border: '1px solid rgba(248,113,113,0.2)' }}>
                    <LogOut size={12} /> Sign Out
                  </button>
                )}
                {v.sign_out_time && <span className="text-xs text-green-400">Signed out</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
