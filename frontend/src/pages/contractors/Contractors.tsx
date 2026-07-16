import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wrench, Plus, AlertTriangle, CheckCircle, Phone, Mail, RefreshCw, Edit2 } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';

interface Contractor {
  id: number;
  company_name: string;
  contact_name: string;
  phone: string;
  email: string;
  service_type: string;
  insurance_expiry: string | null;
  gas_safe_expiry: string | null;
  electric_cert_expiry: string | null;
  dbs_expiry: string | null;
  contract_start: string | null;
  contract_end: string | null;
  notes: string;
  is_active: boolean;
}

const SERVICE_TYPES = ['Plumbing', 'Electrical', 'Gas/Heating', 'Cleaning', 'Catering', 'Security', 'IT/Technology', 'Grounds/Garden', 'Pest Control', 'Window Cleaning', 'Lift Maintenance', 'Fire Safety', 'Laundry', 'Other'];

const EMPTY_FORM = { company_name: '', contact_name: '', phone: '', email: '', service_type: 'Plumbing', insurance_expiry: '', gas_safe_expiry: '', electric_cert_expiry: '', dbs_expiry: '', contract_start: '', contract_end: '', notes: '' };

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [expiring, setExpiring] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = async () => {
    try {
      const [cRes, eRes] = await Promise.all([api.get('/contractors'), api.get('/contractors/expiring')]);
      setContractors(cRes.data);
      setExpiring(eRes.data);
    } catch { toast.error('Failed to load contractors'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/contractors/${editId}`, form);
        toast.success('Contractor updated');
      } else {
        await api.post('/contractors', form);
        toast.success('Contractor added');
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const openEdit = (c: Contractor) => {
    setEditId(c.id);
    setForm({ company_name: c.company_name, contact_name: c.contact_name, phone: c.phone || '', email: c.email || '', service_type: c.service_type, insurance_expiry: c.insurance_expiry?.slice(0, 10) || '', gas_safe_expiry: c.gas_safe_expiry?.slice(0, 10) || '', electric_cert_expiry: c.electric_cert_expiry?.slice(0, 10) || '', dbs_expiry: c.dbs_expiry?.slice(0, 10) || '', contract_start: c.contract_start?.slice(0, 10) || '', contract_end: c.contract_end?.slice(0, 10) || '', notes: c.notes || '' });
    setShowForm(true);
  };


  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
            <Wrench size={20} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Contractor Register</h1>
            <p className="text-sm text-gray-400">External contractors & compliance documents</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Add Contractor
          </button>
        </div>
      </div>

      {/* Expiring alerts */}
      {expiring.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-red-400 text-sm font-medium">{expiring.length} document{expiring.length !== 1 ? 's' : ''} expiring soon or expired</span>
          </div>
          {expiring.map((e, i) => (
            <div key={i} className="text-xs text-gray-400">{e.company_name} — {e.doc_type} expires {format(parseISO(e.expiry_date), 'dd MMM yyyy')}</div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">{editId ? 'Edit Contractor' : 'Add Contractor'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Company Name</label>
              <input value={form.company_name} onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))} required
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Service Type</label>
              <select value={form.service_type} onChange={e => setForm(p => ({ ...p, service_type: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {SERVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Contact Name</label>
              <input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Insurance Expiry</label>
              <input type="date" value={form.insurance_expiry} onChange={e => setForm(p => ({ ...p, insurance_expiry: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Gas Safe Expiry</label>
              <input type="date" value={form.gas_safe_expiry} onChange={e => setForm(p => ({ ...p, gas_safe_expiry: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Electrical Cert Expiry</label>
              <input type="date" value={form.electric_cert_expiry} onChange={e => setForm(p => ({ ...p, electric_cert_expiry: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">DBS Check Expiry</label>
              <input type="date" value={form.dbs_expiry} onChange={e => setForm(p => ({ ...p, dbs_expiry: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className="w-full px-3 py-2 rounded-lg text-white text-sm resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#e8b130' }}>{editId ? 'Update' : 'Add'}</button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: 'rgba(255,255,255,0.06)' }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : contractors.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No contractors registered</div>
      ) : (
        <div className="space-y-3">
          {contractors.map(c => (
            <div key={c.id} className="p-4 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium">{c.company_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded text-amber-400" style={{ background: 'rgba(245,158,11,0.1)' }}>{c.service_type}</span>
                  </div>
                  {c.contact_name && <div className="text-sm text-gray-400 mt-1">{c.contact_name}</div>}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {c.phone && <span className="flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <ExpiryBadge date={c.insurance_expiry} label="Insurance" />
                    <ExpiryBadge date={c.gas_safe_expiry} label="Gas Safe" />
                    <ExpiryBadge date={c.electric_cert_expiry} label="Electrical" />
                    <ExpiryBadge date={c.dbs_expiry} label="DBS" />
                  </div>
                </div>
                <button onClick={() => openEdit(c)} className="p-2 rounded-lg text-gray-400 hover:text-white ml-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  function ExpiryBadge({ date, label }: { date: string | null; label: string }) {
    if (!date) return null;
    const d = parseISO(date);
    const expired = isPast(d);
    const cls = expired ? 'text-red-400 bg-red-400/10' : 'text-green-400 bg-green-400/10';
    return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{label}: {format(d, 'dd/MM/yy')}</span>;
  }
}
