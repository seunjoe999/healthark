import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Plus, Mail, Building2, Search, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

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
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterCategory) params.set('category', filterCategory);
      const res = await api.get(`/external-contacts?${params}`);
      setContacts(res.data);
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

  const categoryColor = (cat: string) => {
    const map: Record<string, string> = { professional: 'text-blue-400 bg-blue-400/10', healthcare: 'text-green-400 bg-green-400/10', emergency: 'text-red-400 bg-red-400/10', authority: 'text-purple-400 bg-purple-400/10', supplier: 'text-amber-400 bg-amber-400/10', other: 'text-gray-400 bg-gray-400/10' };
    return map[cat] || map.other;
  };

  const grouped = CATEGORIES.filter(cat => !filterCategory || cat === filterCategory).map(cat => ({
    cat,
    items: contacts.filter(c => c.category === cat),
  })).filter(g => g.items.length > 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
            <Phone size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">External Contacts</h1>
            <p className="text-sm text-gray-400">Healthcare professionals, authorities & key contacts</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Add Contact
          </button>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..."
              className="w-full pl-9 pr-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>Search</button>
        </form>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCategory('')}
          className={`px-3 py-1.5 rounded-lg text-sm ${filterCategory === '' ? 'text-white' : 'text-gray-400'}`}
          style={{ background: filterCategory === '' ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setFilterCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filterCategory === c ? 'text-white' : 'text-gray-400'}`}
            style={{ background: filterCategory === c ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>{c}</button>
        ))}
      </div>

      {/* Add/edit form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">{editId ? 'Edit Contact' : 'Add Contact'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { key: 'name', label: 'Full Name', required: true, type: 'text' },
              { key: 'organisation', label: 'Organisation', required: false, type: 'text' },
              { key: 'role', label: 'Role / Title', required: true, type: 'text' },
              { key: 'phone', label: 'Phone', required: false, type: 'tel' },
              { key: 'email', label: 'Email', required: false, type: 'email' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} required={f.required}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-white text-sm" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Address</label>
              <input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
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

      {/* Grouped contacts */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No contacts found</div>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat, items }) => (
            <div key={cat}>
              <h3 className="text-sm font-medium text-gray-400 capitalize mb-3">{cat} ({items.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {items.map(c => (
                  <div key={c.id} className="p-4 rounded-xl" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-white font-medium text-sm">{c.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${categoryColor(c.category)}`}>{c.category}</span>
                        </div>
                        <div className="text-xs text-gray-400 mt-0.5">{c.role}</div>
                        {c.organisation && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                            <Building2 size={10} />{c.organisation}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2">
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                              <Phone size={10} />{c.phone}
                            </a>
                          )}
                          {c.email && (
                            <a href={`mailto:${c.email}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                              <Mail size={10} />{c.email}
                            </a>
                          )}
                        </div>
                        {c.notes && <p className="text-xs text-gray-500 mt-1">{c.notes}</p>}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-white" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10">
                          <Trash2 size={12} />
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
