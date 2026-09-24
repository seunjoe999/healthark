import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Plus, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { homesApi, suApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Input, Select, Textarea } from '../../components/ui';

interface EnvCheck {
  id: number;
  check_date: string;
  check_type: string;
  location: string;
  reading_value: string;
  unit: string;
  result: 'pass' | 'fail' | 'action_required';
  notes: string;
  recorded_by_name: string;
  su_name?: string | null;
  home_name?: string | null;
}

interface Summary { total: number; passed: number; failed: number; warnings: number; }

const CHECK_TYPES = [
  { value: 'fridge_temp', label: 'Fridge Temperature' },
  { value: 'freezer_temp', label: 'Freezer Temperature' },
  { value: 'room_temp', label: 'Room Temperature' },
  { value: 'water_temp', label: 'Water Temperature' },
  { value: 'legionella_flush', label: 'Legionella Flushing' },
  { value: 'fire_alarm_test', label: 'Fire Alarm Test' },
  { value: 'emergency_lighting', label: 'Emergency Lighting' },
  { value: 'hoist_check', label: 'Hoist Check' },
  { value: 'window_restrictor', label: 'Window Restrictor' },
];
// Custom check-type names typed in previously by this home, so they show up
// as pickable options again instead of everyone re-typing the same custom
// check from scratch — "customize it" per the request, without a separate
// admin screen to manage a list.
const CUSTOM_OPTION = '__custom__';

const emptyForm = { check_type: 'room_temp', customType: '', su_id: '', location: '', reading_value: '', unit: '°C', result: 'pass', notes: '' };

export default function EnvironmentalChecks() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const tileBg = isDark ? '#111111' : '#ffffff';
  const tileBorder = isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(15,23,42,0.08)';
  const btnGhostBg = isDark ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const headingText = isDark ? 'text-white' : 'text-slate-900';
  const mutedText = isDark ? 'text-slate-400' : 'text-slate-500';
  const [checks, setChecks] = useState<EnvCheck[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, passed: 0, failed: 0, warnings: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('7');
  const [typeFilter, setTypeFilter] = useState('');
  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHome, setSelectedHome] = useState('');
  const [residents, setResidents] = useState<any[]>([]);
  const [customTypeNames, setCustomTypeNames] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    homesApi.list().then(res => {
      const h = res.data.data || [];
      setHomes(h);
      setSelectedHome(user?.homeId || h[0]?.id || '');
    }).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!selectedHome) return;
    suApi.list(selectedHome, { status: 'live' }).then(res => setResidents(res.data.data || [])).catch(() => {});
  }, [selectedHome]);

  const fetchData = useCallback(async () => {
    if (!selectedHome) return;
    setLoading(true);
    try {
      const [checksRes, summaryRes] = await Promise.all([
        api.get('/environmental', { params: { days: filter, homeId: selectedHome } }),
        api.get('/environmental/summary', { params: { homeId: selectedHome } }),
      ]);
      const checksData = checksRes.data.data || [];
      setChecks(checksData);
      const failed = checksData.filter((c: any) => c.result === 'fail' || c.result === 'action_required').length;
      const warnings = checksData.filter((c: any) => c.result === 'warning').length;
      const passed = checksData.length - failed - warnings;
      setSummary({ total: checksData.length, passed, failed, warnings });
      // Surface any custom check-type names already used at this home so they
      // reappear as pickable options for next time.
      const known = new Set(CHECK_TYPES.map(t => t.value));
      const custom = Array.from(new Set(
        checksData.map((c: any) => c.check_type).filter((t: string) => t && !known.has(t))
      )) as string[];
      setCustomTypeNames(custom);
    } catch { toast.error('Failed to load checks'); }
    finally { setLoading(false); }
  }, [filter, selectedHome]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setTypeFilter('') }, [filter, selectedHome]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checkType = form.check_type === CUSTOM_OPTION ? form.customType.trim() : form.check_type;
    if (!checkType) { toast.error('Enter a name for the custom check'); return; }
    try {
      await api.post('/environmental', {
        homeId: selectedHome,
        checkType,
        location: form.location,
        suId: form.su_id || null,
        readingValue: form.reading_value,
        unit: form.unit,
        result: form.result,
        notes: form.notes,
      });
      toast.success('Check recorded');
      setShowForm(false);
      setForm({ ...emptyForm });
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle size={16} className="text-emerald-500" />;
    if (s === 'fail') return <XCircle size={16} className="text-rose-500" />;
    return <AlertTriangle size={16} className="text-amber-500" />;
  };

  const statusColor = (s: string) => s === 'pass' ? 'text-emerald-500' : s === 'fail' ? 'text-rose-500' : 'text-amber-500';
  const resultLabel = (s: string) => s === 'action_required' ? 'Action Required' : s.charAt(0).toUpperCase() + s.slice(1);
  const typeLabel = (t: string) => CHECK_TYPES.find(ct => ct.value === t)?.label || t;
  const typeOptions = [
    ...CHECK_TYPES,
    ...customTypeNames.map(t => ({ value: t, label: `${t} (custom)` })),
    { value: CUSTOM_OPTION, label: '+ Add a new custom check type...' },
  ];
  const residentOptions = residents.map(r => ({ value: r.id, label: `${r.first_name} ${r.last_name}` }));
  // Only offer types actually present in the loaded (day-range-filtered) checks,
  // so the dropdown doesn't list types with nothing to show for this period.
  const presentTypes = Array.from(new Set(checks.map(c => c.check_type)));
  const typeFilterOptions = presentTypes.map(t => ({ value: t, label: typeLabel(t) }));
  const filteredChecks = typeFilter ? checks.filter(c => c.check_type === typeFilter) : checks;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.15)' }}>
            <Thermometer size={20} className="text-sky-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${headingText}`}>Environmental Checks</h1>
            <p className={`text-sm font-medium ${mutedText}`}>Temperature, water safety & facility monitoring</p>
          </div>
        </div>
        <div className="flex gap-2 items-center">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <button onClick={fetchData} className={mutedText + " p-2 rounded-lg hover:opacity-70"} style={{ background: btnGhostBg }}>
            <RefreshCw size={16} />
          </button>
          <Button variant="gold" icon={<Plus size={16} />} onClick={() => setShowForm(true)}>Add Check</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, color: headingText },
          { label: 'Passed', value: summary.passed, color: 'text-emerald-500' },
          { label: 'Failed', value: summary.failed, color: 'text-rose-500' },
          { label: 'Warnings', value: summary.warnings, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: tileBg, border: tileBorder }}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className={`text-xs mt-1 font-semibold uppercase tracking-wide ${mutedText}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 items-center flex-wrap">
        {['7', '14', '30', '90'].map(d => (
          <button key={d} onClick={() => setFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === d ? 'text-white' : mutedText}`}
            style={{ background: filter === d ? '#e8b130' : btnGhostBg }}>
            {d}d
          </button>
        ))}
        {presentTypes.length > 0 && (
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-sm text-slate-600 bg-white">
            <option value="">All check types</option>
            {typeFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: tileBg, border: tileBorder }}>
          <h3 className={`${headingText} font-bold`}>Record Environmental Check</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Check Type" value={form.check_type}
              onChange={e => setForm(p => ({ ...p, check_type: e.target.value }))}
              options={typeOptions} />
            {form.check_type === CUSTOM_OPTION && (
              <Input label="New check type name *" required value={form.customType}
                onChange={e => setForm(p => ({ ...p, customType: e.target.value }))}
                placeholder="e.g. Fob Battery Check" />
            )}
            <Select label="Service User (optional)" value={form.su_id}
              onChange={e => setForm(p => ({ ...p, su_id: e.target.value }))}
              options={residentOptions} placeholder="— Whole service, not one resident —" />
            <Input label="Location *" required value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Kitchen, Room 3" />
            <div>
              <label className="label">Reading Value</label>
              <div className="flex gap-2">
                <input value={form.reading_value} onChange={e => setForm(p => ({ ...p, reading_value: e.target.value }))}
                  placeholder="e.g. 5.2" className="input flex-1" />
                <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="unit" className="input w-20" />
              </div>
            </div>
            <Select label="Status" value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))}
              options={[
                { value: 'pass', label: 'Pass' },
                { value: 'action_required', label: 'Action Required' },
                { value: 'fail', label: 'Fail' },
              ]} />
            <div className="md:col-span-2">
              <Textarea label="Notes" rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit" variant="gold">Save Check</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setForm({ ...emptyForm }) }}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Checks list */}
      {loading ? (
        <div className={`text-center py-12 ${mutedText}`}>Loading...</div>
      ) : filteredChecks.length === 0 ? (
        <div className={`text-center py-12 ${mutedText}`}>{typeFilter ? 'No checks of this type recorded for this period' : 'No checks recorded for this period'}</div>
      ) : (
        <div className="space-y-2">
          {filteredChecks.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-4 p-4 rounded-xl" style={{ background: tileBg, border: tileBorder }}>
              <div className="flex-shrink-0">{statusIcon(c.result)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`${headingText} text-sm font-bold`}>{typeLabel(c.check_type)}</span>
                  <span className={`text-xs ${mutedText}`}>— {c.location}</span>
                  <span className={`text-xs font-semibold ${statusColor(c.result)}`}>{resultLabel(c.result)}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500">
                    {c.su_name || c.home_name || 'Service'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`text-xs ${mutedText}`}>{format(new Date(String(c.check_date).includes('T') ? c.check_date : c.check_date + 'T12:00:00'), 'dd MMM yyyy')}</span>
                  <span className={`text-xs font-medium ${statusColor(c.result)}`}>{c.reading_value} {c.unit}</span>
                  {c.notes && <span className={`text-xs truncate ${mutedText}`}>{c.notes}</span>}
                </div>
              </div>
              <div className={`text-xs flex-shrink-0 ${mutedText}`}>{c.recorded_by_name}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
