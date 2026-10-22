import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Plus, Mail, Building2, Search, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface Contact {
  id: number;
  name: string;
  organisation: string | null;
  role: string;
  category: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
}

const CATEGORIES = ['professional', 'healthcare', 'emergency', 'authority', 'supplier', 'other'];
const EMPTY_FORM = { name: '', organisation: '', role: '', category: 'professional', phone: '', email: '', address: '', notes: '' };

export default function ExternalContacts() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const tileBg = theme === 'dark' ? '#111111' : '#ffffff';
  const tileBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.1)';
  const inputBg = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc';
  const inputBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(15,23,42,0.15)';
  const btnGhostBg = theme === 'dark' ? 'rgba(255,255,255,0.08)' : '#e2e8f0';
  const neutralText = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const inputTextCls = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = async () => {
    try {
      const params: Record<string, string> = {};
      if (user?.homeId) params.homeId = user.homeId;
      if (search) params.search = search;
      if (filterCategory) params.category = filterCategory;
      const res = await api.get('/external-contacts', { params });
      setContacts(res.data.data || res.data || []);
    } catch { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterCategory]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchData(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/external-contacts/${editId}`, form);
        toast.success('Contact updated');
      } else {
        await api.post('/external-contacts', form);
        toast.success('Contact added');
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const openEdit = (c: Contact) => {
    setEditId(c.id);
    setForm({ name: c.name, organisation: c.organisation || '', role: c.role, category: c.category, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Remove this contact?')) return;
    try {
      await api.delete(`/external-contacts/${id}`);
      toast.success('Contact removed');
      fetchData();
    } catch { toast.error('Failed to remove'); }
  };

  const grouped = CATEGORIES.filter(cat => !filterCategory || cat === filterCategory).map(cat => ({
    cat,
    items: contacts.filter(c => c.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-sm" style={{ background: '#e8b130' }}>
            <Phone size={20} style={{ color: '#0f172a' }} />
          </div>
          <div>
            <h1 className={`text-2xl font-extrabold ${neutralText}`}>External Contacts</h1>
            <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              Healthcare professionals, authorities &amp; key contacts
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2.5 rounded-xl font-bold transition-transform hover:scale-105"
            style={{ background: '#e8b130', color: '#0f172a' }}
            title="Refresh contacts"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-extrabold shadow-sm transition-transform hover:scale-[1.02]"
            style={{ background: '#e8b130', color: '#0f172a' }}
          >
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search contacts by name, organisation, role, phone..."
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl ${inputTextCls} text-sm font-medium`}
              style={{ background: inputBg, border: inputBorder }}
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-sm font-extrabold shadow-sm"
            style={{ background: '#e8b130', color: '#0f172a' }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Bold, solid yellow/gold category headings — ZERO greyed-out buttons */}
      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={() => setFilterCategory('')}
          className="px-4 py-2 rounded-xl text-sm font-extrabold tracking-wide shadow-sm transition-all"
          style={{
            background: filterCategory === '' ? '#f59e0b' : '#fde047',
            color: '#0f172a',
            border: filterCategory === '' ? '2.5px solid #0f172a' : '1.5px solid #ca8a04',
            transform: filterCategory === '' ? 'scale(1.03)' : undefined,
          }}
        >
          All ({contacts.length})
        </button>
        {CATEGORIES.map(c => {
          const isSelected = filterCategory === c;
          return (
            <button
              key={c}
              onClick={() => setFilterCategory(c)}
              className="px-4 py-2 rounded-xl text-sm font-extrabold capitalize tracking-wide shadow-sm transition-all"
              style={{
                background: isSelected ? '#f59e0b' : '#fde047',
                color: '#0f172a',
                border: isSelected ? '2.5px solid #0f172a' : '1.5px solid #ca8a04',
                transform: isSelected ? 'scale(1.03)' : undefined,
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {/* Add/edit form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: tileBg, border: tileBorder }}>
          <h3 className={`${neutralText} text-base font-extrabold`}>{editId ? 'Edit Contact' : 'Add Contact'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Full Name *', required: true, type: 'text' },
              { key: 'organisation', label: 'Organisation', required: false, type: 'text' },
              { key: 'role', label: 'Role / Title *', required: true, type: 'text' },
              { key: 'phone', label: 'Phone', required: false, type: 'tel' },
              { key: 'email', label: 'Email', required: false, type: 'email' },
            ].map(f => (
              <div key={f.key}>
                <label className={`text-xs font-bold mb-1 block ${neutralText}`}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} required={f.required}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }} />
              </div>
            ))}
            <div>
              <label className={`text-xs font-bold mb-1 block ${neutralText}`}>Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm capitalize font-semibold`} style={{ background: inputBg, border: inputBorder }}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className={`text-xs font-bold mb-1 block ${neutralText}`}>Address</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }} />
            </div>
            <div className="md:col-span-2">
              <label className={`text-xs font-bold mb-1 block ${neutralText}`}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm resize-none`} style={{ background: inputBg, border: inputBorder }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-5 py-2 rounded-lg text-sm font-extrabold" style={{ background: '#e8b130', color: '#0f172a' }}>
                {editId ? 'Update Contact' : 'Save Contact'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className={`px-4 py-2 rounded-lg text-sm font-bold ${neutralText}`} style={{ background: btnGhostBg }}>
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Grouped contacts */}
      {loading ? (
        <div className={`text-center font-semibold py-12 ${neutralText}`}>Loading...</div>
      ) : contacts.length === 0 ? (
        <div className={`text-center font-semibold py-12 ${neutralText}`}>No contacts found</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <div className="mb-3">
                <h3
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-base font-extrabold capitalize tracking-wide shadow-sm"
                  style={{ background: '#e8b130', color: '#0f172a' }}
                >
                  {cat} ({items.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(c => (
                  <div key={c.id} className="p-4 rounded-xl" style={{ background: tileBg, border: tileBorder }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`${neutralText} font-bold text-base`}>{c.name}</span>
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-lg font-extrabold capitalize"
                            style={{ background: '#fde047', color: '#0f172a' }}
                          >
                            {c.category}
                          </span>
                        </div>
                        <div className={`text-xs font-semibold mt-0.5 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{c.role}</div>
                        {c.organisation && (
                          <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                            <Building2 size={12} />{c.organisation}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2.5">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:underline">
                              <Phone size={12} />{c.phone}
                            </a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs font-bold text-emerald-500 hover:underline">
                              <Mail size={12} />{c.email}
                            </a>
                          )}
                        </div>
                        {c.address && <div className={`text-xs mt-1.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{c.address}</div>}
                        {c.notes && <div className={`text-xs italic mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>{c.notes}</div>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-500/10" title="Edit">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/10" title="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
