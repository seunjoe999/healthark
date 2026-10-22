import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ChevronDown, ChevronUp, RefreshCw, Search, Building2, UserCheck, User } from 'lucide-react';
import api from '../../api';
import { format, parseISO } from 'date-fns';

interface AuditEntry {
  id: string;
  staff_id?: string;
  staff_name?: string;
  staff_role?: string;
  staff_role_label?: string;
  actor_source?: 'office' | 'staff';
  actor_source_label?: string;
  target_person_name?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_label?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  created_at: string;
}

const ACTION_COLOURS: Record<string, string> = {
  create: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  update: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  delete: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  view: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  login: 'bg-purple-500/15 text-purple-700 border-purple-500/30',
  export: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30',
};

const HIDDEN_KEYS = new Set([
  'id', 'home_id', 'homeId', 'su_id', 'suId', 'staff_id', 'staffId', 'created_by', 'conducted_by',
  'recorded_by', 'created_at', 'updated_at', 'password', 'password_hash', 'pin', 'pin_hash',
]);

function formatVal(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    try { return format(parseISO(val), 'dd MMM yyyy HH:mm'); } catch { return val; }
  }
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function computeChanges(oldData: any, newData: any): { key: string; label: string; before: string; after: string; changed: boolean }[] {
  const o = typeof oldData === 'string' ? (() => { try { return JSON.parse(oldData); } catch { return {}; } })() : (oldData || {});
  const n = typeof newData === 'string' ? (() => { try { return JSON.parse(newData); } catch { return {}; } })() : (newData || {});
  const allKeys = Array.from(new Set([...Object.keys(o), ...Object.keys(n)])).filter(k => !HIDDEN_KEYS.has(k));

  const rows = allKeys.map(key => {
    const bv = formatVal(o[key]);
    const av = formatVal(n[key]);
    const hasOld = Object.keys(o).length > 0;
    const changed = hasOld ? bv !== av : av !== '—';
    return {
      key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(),
      before: hasOld ? bv : '— (New record)',
      after: av,
      changed,
    };
  });

  const changedOnly = rows.filter(r => r.changed);
  return changedOnly.length > 0 ? changedOnly : rows.filter(r => r.after !== '—').slice(0, 8);
}

export default function AuditTrail() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (actionFilter) params.action = actionFilter;
      if (sourceFilter) params.actorSource = sourceFilter;
      if (search.trim()) params.search = search.trim();
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/audit-trail', { params });
      setEntries(res.data?.data || []);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, [actionFilter, sourceFilter, search, from, to]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => setExpanded(p => {
    const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto text-slate-800">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-amber-500" /> Audit Trail
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Complete CQC log showing who modified a record (Office/Management vs Care Staff), whose profile was altered, and exact field changes
          </p>
        </div>
        <button onClick={load} className="btn btn-secondary flex items-center gap-1.5 text-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 block mb-1">Search person, staff or module</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Resident name, staff name, module…"
              className="input text-sm pl-9 w-full"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Modified by role</label>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="input text-sm w-48">
            <option value="">All (Office &amp; Care Staff)</option>
            <option value="office">Office / Management</option>
            <option value="staff">Care Staff / Floor</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">Action</label>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} className="input text-sm w-36">
            <option value="">All actions</option>
            {['create', 'update', 'delete', 'login', 'export'].map(a => (
              <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input text-sm" />
        </div>
        <div>
          <label className="text-xs font-semibold text-slate-500 block mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input text-sm" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <div key={i} className="card p-4 h-20 animate-pulse" />)}</div>
      ) : entries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Shield className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-700 font-semibold">No audit entries matching these filters</p>
          <p className="text-slate-400 text-sm mt-1">All system changes by management and care staff are logged automatically here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {entries.map(e => {
            const rawDiffs = computeChanges(e.old_data, e.new_data);
            const diffs = rawDiffs.length > 0
              ? rawDiffs
              : Array.isArray((e as any).changes)
              ? (e as any).changes.map((c: any, idx: number) => ({
                  key: c.field || String(idx),
                  label: c.label || c.field || 'Change',
                  before: c.before ?? '—',
                  after: c.after ?? '—',
                }))
              : [];
            const isOffice = e.actor_source === 'office';
            const isOpen = expanded.has(e.id);
            const moduleLabel = ((e as any).module_label || e.resource_type || 'record').replace(/_/g, ' ');
            const changedFieldsPreview = diffs.slice(0, 4).map((d: any) => d.label).join(', ');
            const specificDesc = (e as any).action_description || e.resource_label;

            return (
              <div key={e.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-amber-300">
                <div
                  className="p-4 cursor-pointer flex items-start justify-between gap-4"
                  onClick={() => toggle(e.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Top row: Action + Module + Whose Profile/Record + Specific Action Description */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wide ${ACTION_COLOURS[e.action] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {e.action}
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {moduleLabel}
                      </span>
                      {e.target_person_name && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                          <User className="w-3 h-3" /> {e.target_person_name}
                        </span>
                      )}
                      {specificDesc && (
                        <span className="text-sm font-semibold text-slate-900">
                          {specificDesc}
                        </span>
                      )}
                    </div>

                    {/* Second row: WHO made the change + Office/Management vs Care Staff badge */}
                    <div className="flex items-center gap-2.5 flex-wrap text-xs">
                      <span className="text-slate-600">
                        Modified by <strong className="text-slate-900 font-bold">{e.staff_name || 'Unknown User'}</strong>
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${
                        isOffice
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}>
                        {isOffice ? <Building2 className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        {isOffice ? 'Office / Management' : 'Care Staff'}
                        {e.staff_role_label ? ` (${e.staff_role_label})` : ''}
                      </span>
                      {changedFieldsPreview && (
                        <span className="text-slate-500 truncate max-w-md">
                          · Fields updated: <span className="font-medium text-slate-700 capitalize">{changedFieldsPreview}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Timestamp + Expand */}
                  <div className="flex items-center gap-2 flex-shrink-0 text-right">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">
                        {format(parseISO(e.created_at), 'dd MMM yyyy, HH:mm')}
                      </p>
                      {e.ip_address && <p className="text-[11px] text-slate-400">IP: {e.ip_address}</p>}
                    </div>
                    <div className="text-slate-400">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded exact field-by-field Before -> After panel */}
                {isOpen && (
                  <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/60">
                    {diffs.length > 0 ? (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="w-full text-xs text-slate-800">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-left">
                              <th className="px-3 py-2 font-bold text-slate-600 uppercase tracking-wide w-1/4">Field Changed</th>
                              <th className="px-3 py-2 font-bold text-rose-700 uppercase tracking-wide w-[37.5%]">Previous Value</th>
                              <th className="px-3 py-2 font-bold text-emerald-700 uppercase tracking-wide w-[37.5%]">New Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {diffs.map((d: any) => (
                              <tr key={d.key}>
                                <td className="px-3 py-2 font-semibold text-slate-800 capitalize align-top">{d.label}</td>
                                <td className="px-3 py-2 text-rose-700 bg-rose-50/30 whitespace-pre-wrap break-words align-top">{d.before}</td>
                                <td className="px-3 py-2 text-emerald-800 bg-emerald-50/30 font-medium whitespace-pre-wrap break-words align-top">{d.after}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 p-3 rounded-xl bg-white border border-slate-200">
                        Legacy action recorded before field-level diff capture was enabled — Actor: <strong className="text-slate-800">{e.staff_name}</strong> ({e.actor_source_label}){e.target_person_name ? ` · Target Profile: ${e.target_person_name}` : ''}.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
