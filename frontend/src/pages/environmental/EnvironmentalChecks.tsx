import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Plus, CheckCircle, XCircle, AlertTriangle, RefreshCw, Edit, Printer, Download } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api, { homesApi, suApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button, Input, Select, Textarea } from '../../components/ui';
import { UniformFilterBar } from '../../components/ui/FilterBar';
import { openLetterheadPrint, buildLetterheadPage, fmtDate, esc } from '../../utils/letterheadPrint';

interface EnvCheck {
  id: number;
  check_date: string;
  check_time: string | null;
  check_type: string;
  location: string;
  reading_value: string;
  unit: string;
  result: 'pass' | 'fail' | 'action_required';
  action_taken: string | null;
  notes: string;
  recorded_by: string;
  recorded_by_name: string;
  su_id?: string | null;
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

  // Comprehensive Filters
  const [filterDays, setFilterDays] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [suFilter, setSuFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [homes, setHomes] = useState<any[]>([]);
  const [selectedHome, setSelectedHome] = useState('');
  const [residents, setResidents] = useState<any[]>([]);
  const [customTypeNames, setCustomTypeNames] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingCheck, setEditingCheck] = useState<EnvCheck | null>(null);

  const canEdit = (c: EnvCheck) => user?.role !== 'care_staff' || c.recorded_by === user?.id;

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
      const params: Record<string, any> = { homeId: selectedHome };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      if (!dateFrom && !dateTo && filterDays !== 'all') params.days = filterDays;
      if (typeFilter) params.checkType = typeFilter;
      if (suFilter) params.suId = suFilter;
      if (resultFilter) params.result = resultFilter;
      if (search.trim()) params.search = search.trim();

      const checksRes = await api.get('/environmental', { params });
      const checksData: EnvCheck[] = checksRes.data.data || [];
      setChecks(checksData);

      const failed = checksData.filter((c: any) => c.result === 'fail').length;
      const warnings = checksData.filter((c: any) => c.result === 'action_required' || c.result === 'warning').length;
      const passed = checksData.length - failed - warnings;
      setSummary({ total: checksData.length, passed, failed, warnings });

      const known = new Set(CHECK_TYPES.map(t => t.value));
      const custom = Array.from(new Set(
        checksData.map((c: any) => c.check_type).filter((t: string) => t && !known.has(t))
      )) as string[];
      if (custom.length) {
        setCustomTypeNames(prev => Array.from(new Set([...prev, ...custom])));
      }
    } catch {
      toast.error('Failed to load checks');
    } finally {
      setLoading(false);
    }
  }, [filterDays, dateFrom, dateTo, typeFilter, suFilter, resultFilter, search, selectedHome]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const checkType = form.check_type === CUSTOM_OPTION ? form.customType.trim() : form.check_type;
    if (!checkType) { toast.error('Enter a name for the custom check'); return; }
    try {
      if (editingCheck) {
        await api.put(`/environmental/${editingCheck.id}`, {
          checkDate: editingCheck.check_date,
          checkTime: editingCheck.check_time,
          checkType,
          location: form.location,
          suId: form.su_id || null,
          readingValue: form.reading_value,
          unit: form.unit,
          result: form.result,
          actionTaken: editingCheck.action_taken,
          notes: form.notes,
        });
        toast.success('Environmental check updated');
      } else {
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
        toast.success('Environmental check recorded');
      }
      setShowForm(false);
      setEditingCheck(null);
      setForm({ ...emptyForm });
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const openEdit = (c: EnvCheck) => {
    setEditingCheck(c);
    setForm({
      check_type: c.check_type,
      customType: '',
      su_id: c.su_id || '',
      location: c.location || '',
      reading_value: c.reading_value || '',
      unit: c.unit || '',
      result: c.result,
      notes: c.notes || '',
    });
    setShowForm(true);
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

  // Offer ALL standard + custom check types in the filter bar so staff/managers can filter by e.g. Fridge Temperature anytime
  const allFilterTypeOptions = useMemo(() => [
    ...CHECK_TYPES,
    ...customTypeNames.map(t => ({ value: t, label: `${t} (custom)` })),
  ], [customTypeNames]);

  const residentOptions = residents.map(r => ({ value: r.id, label: `${r.first_name} ${r.last_name}` }));

  const handlePrint = () => {
    const homeName = homes.find(h => h.id === selectedHome)?.name || 'Service';
    const rowsHtml = checks.map(c => `
      <tr>
        <th>${c.check_date ? fmtDate(c.check_date) : '—'}<br/><span style="font-weight:700;font-size:10px">${esc(c.location || c.home_name || 'Service')}</span></th>
        <td>
          <strong>Check Type:</strong> ${esc(typeLabel(c.check_type))} · <strong>Status:</strong> ${esc(resultLabel(c.result))}
          ${c.reading_value ? `<br/><strong>Reading:</strong> ${esc(c.reading_value)} ${esc(c.unit || '')}` : ''}
          ${c.su_name ? `<br/><strong>Service User:</strong> ${esc(c.su_name)}` : ''}
          ${c.recorded_by_name ? `<br/><strong>Recorded By:</strong> ${esc(c.recorded_by_name)}` : ''}
          ${c.notes ? `<br/><em>${esc(c.notes)}</em>` : ''}
        </td>
      </tr>
    `).join('');
    const body = buildLetterheadPage({
      docTitle: 'Environmental Checks Report',
      docSubtitle: 'Temperature, water safety & service environmental compliance log',
      docRefPrefix: 'ENV',
      docRefId: format(new Date(), 'yyyyMMdd'),
      residentName: homeName,
      sections: [
        {
          title: `Environmental Check Records (${checks.length})`,
          inner: checks.length ? `<table class="fields">${rowsHtml}</table>` : '<p class="body-text muted">No checks recorded for the selected filters.</p>',
        },
      ],
    });
    openLetterheadPrint(`${homeName} — Environmental Checks`, body);
  };

  const handleDownloadCsv = () => {
    const headers = ['Date', 'Name of Service', 'Check Type', 'Service User', 'Reading', 'Unit', 'Status', 'Notes', 'Recorded By'];
    const rows = checks.map(c => [
      String(c.check_date || '').slice(0, 10),
      c.location || c.home_name || '',
      typeLabel(c.check_type),
      c.su_name || '',
      c.reading_value || '',
      c.unit || '',
      resultLabel(c.result),
      c.notes || '',
      c.recorded_by_name || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `environmental-checks-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.15)' }}>
            <Thermometer size={20} className="text-sky-500" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${headingText}`}>Environmental Checks</h1>
            <p className={`text-sm font-medium ${mutedText}`}>Temperature, water safety &amp; service environmental monitoring</p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {homes.length > 1 && (
            <select className="input w-auto text-sm" value={selectedHome} onChange={e => setSelectedHome(e.target.value)}>
              {homes.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          )}
          <Button variant="outline" icon={<Download size={15} />} onClick={handleDownloadCsv}>CSV</Button>
          <Button variant="outline" icon={<Printer size={15} />} onClick={handlePrint}>Print / PDF</Button>
          <button onClick={fetchData} className={mutedText + ' p-2 rounded-lg hover:opacity-70'} style={{ background: btnGhostBg }}>
            <RefreshCw size={16} />
          </button>
          <Button variant="gold" icon={<Plus size={16} />} onClick={() => { setEditingCheck(null); setForm({ ...emptyForm }); setShowForm(true); }}>
            Add Check
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Checks', value: summary.total, color: headingText },
          { label: 'Passed', value: summary.passed, color: 'text-emerald-500' },
          { label: 'Failed', value: summary.failed, color: 'text-rose-500' },
          { label: 'Action Required', value: summary.warnings, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: tileBg, border: tileBorder }}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className={`text-xs mt-1 font-semibold uppercase tracking-wide ${mutedText}`}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Comprehensive Uniform Filter Bar */}
      <UniformFilterBar
        personLabel="Service User"
        personAllLabel="All Service Users"
        personValue={suFilter}
        onPersonChange={setSuFilter}
        personOptions={residentOptions}
        searchPlaceholder="Search Name of Service, check type, staff, notes..."
        searchValue={search}
        onSearchChange={setSearch}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        extraFilters={
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Check Type
              </label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="input h-[38px] text-sm min-w-[180px]"
              >
                <option value="">All Check Types</option>
                {allFilterTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Status
              </label>
              <select
                value={resultFilter}
                onChange={e => setResultFilter(e.target.value)}
                className="input h-[38px] text-sm min-w-[140px]"
              >
                <option value="">All Statuses</option>
                <option value="pass">Pass</option>
                <option value="action_required">Action Required</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Period
              </label>
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: '7', label: '7d' },
                  { key: '30', label: '30d' },
                  { key: '90', label: '90d' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => { setFilterDays(p.key); setDateFrom(''); setDateTo(''); }}
                    className="px-3 h-[38px] rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: filterDays === p.key && !dateFrom && !dateTo ? '#e8b130' : btnGhostBg,
                      color: filterDays === p.key && !dateFrom && !dateTo ? '#0f172a' : undefined,
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        onClear={() => {
          setSuFilter('');
          setTypeFilter('');
          setResultFilter('');
          setSearch('');
          setDateFrom('');
          setDateTo('');
          setFilterDays('all');
        }}
        shownCount={checks.length}
      />

      {/* Add / Edit form — "Location" explicitly renamed to "Name of Service *" */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: tileBg, border: tileBorder }}>
          <h3 className={`${headingText} font-bold`}>{editingCheck ? 'Edit Environmental Check' : 'Record Environmental Check'}</h3>
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
            <Input
              label="Name of Service *"
              required
              value={form.location}
              onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Supported Living Service A, Main Care Home"
            />
            <div>
              <label className="label">Reading Value</label>
              <div className="flex gap-2">
                <input value={form.reading_value} onChange={e => setForm(p => ({ ...p, reading_value: e.target.value }))}
                  placeholder="e.g. 4.2" className="input flex-1" />
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
              <Button type="submit" variant="gold">{editingCheck ? 'Update Check' : 'Save Check'}</Button>
              <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setEditingCheck(null); setForm({ ...emptyForm }); }}>Cancel</Button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Checks list */}
      {loading ? (
        <div className={`text-center py-12 ${mutedText}`}>Loading...</div>
      ) : checks.length === 0 ? (
        <div className={`text-center py-12 ${mutedText}`}>
          No environmental checks match the selected filters
        </div>
      ) : (
        <div className="space-y-2">
          {checks.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => canEdit(c) && openEdit(c)}
              className={`flex items-center gap-4 p-4 rounded-xl transition-all ${canEdit(c) ? 'cursor-pointer hover:ring-1 hover:ring-sky-500/40' : ''}`}
              style={{ background: tileBg, border: tileBorder }}>
              <div className="flex-shrink-0">{statusIcon(c.result)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wide"
                    style={{ background: '#e8b130', color: '#0f172a' }}>
                    Service: {c.location || c.home_name || 'Main Service'}
                  </span>
                  <span className={`${headingText} text-sm font-bold`}>{typeLabel(c.check_type)}</span>
                  <span className={`text-xs font-bold ${statusColor(c.result)}`}>{resultLabel(c.result)}</span>
                  {c.su_name && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-500">
                      Resident: {c.su_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`text-xs font-medium ${mutedText}`}>
                    {format(new Date(String(c.check_date).includes('T') ? c.check_date : c.check_date + 'T12:00:00'), 'dd MMM yyyy')}
                  </span>
                  {c.reading_value && (
                    <span className={`text-xs font-bold ${statusColor(c.result)}`}>{c.reading_value} {c.unit}</span>
                  )}
                  {c.notes && <span className={`text-xs truncate ${mutedText}`}>{c.notes}</span>}
                </div>
              </div>
              <div className={`text-xs flex-shrink-0 flex items-center gap-2 ${mutedText}`}>
                {c.recorded_by_name}
                {canEdit(c) && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); openEdit(c); }}
                    title="Edit this check"
                    className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors hover:text-blue-400"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
