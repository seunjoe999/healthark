import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Plus, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

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
  { value: 'other', label: 'Other' },
];

export default function EnvironmentalChecks() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const tileBg = theme === 'dark' ? '#111111' : '#ffffff';
  const tileBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(15,23,42,0.08)';
  const inputBg = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f8fafc';
  const inputBorder = theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(15,23,42,0.12)';
  const btnGhostBg = theme === 'dark' ? 'rgba(255,255,255,0.06)' : '#f1f5f9';
  const neutralText = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const inputTextCls = theme === 'dark' ? 'text-white' : 'text-slate-900';
  const [checks, setChecks] = useState<EnvCheck[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, passed: 0, failed: 0, warnings: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('7');
  const [form, setForm] = useState({ check_type: 'room_temp', location: '', reading_value: '', unit: '°C', result: 'pass', notes: '' });

  const fetchData = async () => {
    try {
      const hParams = user?.homeId ? { homeId: user.homeId } : {};
      const [checksRes, summaryRes] = await Promise.all([
        api.get('/environmental', { params: { days: filter, ...hParams } }),
        api.get('/environmental/summary', { params: hParams }),
      ]);
      const checksData = checksRes.data.data || [];
      setChecks(checksData);
      const failed = checksData.filter((c: any) => c.result === 'fail' || c.result === 'action_required').length;
      const warnings = checksData.filter((c: any) => c.result === 'warning').length;
      const passed = checksData.length - failed - warnings;
      setSummary({ total: checksData.length, passed, failed, warnings });
    } catch { toast.error('Failed to load checks'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/environmental', {
        checkType: form.check_type,
        location: form.location,
        readingValue: form.reading_value,
        unit: form.unit,
        result: form.result,
        notes: form.notes,
      });
      toast.success('Check recorded');
      setShowForm(false);
      setForm({ check_type: 'room_temp', location: '', reading_value: '', unit: '°C', result: 'pass', notes: '' });
      fetchData();
    } catch { toast.error('Failed to save'); }
  };

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle size={16} className="text-green-400" />;
    if (s === 'fail') return <XCircle size={16} className="text-red-400" />;
    return <AlertTriangle size={16} className="text-yellow-400" />;
  };

  const statusColor = (s: string) => s === 'pass' ? 'text-green-400' : s === 'fail' ? 'text-red-400' : 'text-yellow-400';
  const resultLabel = (s: string) => s === 'action_required' ? 'Action Required' : s.charAt(0).toUpperCase() + s.slice(1);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.15)' }}>
            <Thermometer size={20} className="text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Environmental Checks</h1>
            <p className="text-sm text-gray-400">Temperature, water safety & facility monitoring</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchData} className="p-2 rounded-lg text-gray-400 hover:text-white" style={{ background: btnGhostBg }}>
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white" style={{ background: '#e8b130' }}>
            <Plus size={16} /> Add Check
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: summary.total, color: neutralText },
          { label: 'Passed', value: summary.passed, color: 'text-green-400' },
          { label: 'Failed', value: summary.failed, color: 'text-red-400' },
          { label: 'Warnings', value: summary.warnings, color: 'text-yellow-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={{ background: tileBg, border: tileBorder }}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['7', '14', '30', '90'].map(d => (
          <button key={d} onClick={() => setFilter(d)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filter === d ? 'text-white font-medium' : 'text-gray-400'}`}
            style={{ background: filter === d ? '#e8b130' : btnGhostBg }}>
            {d}d
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 space-y-4" style={{ background: tileBg, border: tileBorder }}>
          <h3 className={`${neutralText} font-medium`}>Record Environmental Check</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Check Type</label>
              <select value={form.check_type} onChange={e => setForm(p => ({ ...p, check_type: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }}>
                {CHECK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Location</label>
              <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} required
                placeholder="e.g. Kitchen, Room 3" className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Reading Value</label>
              <div className="flex gap-2">
                <input value={form.reading_value} onChange={e => setForm(p => ({ ...p, reading_value: e.target.value }))} required
                  placeholder="e.g. 5.2" className={`flex-1 px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }} />
                <input value={form.unit} onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                  placeholder="unit" className={`w-20 px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Status</label>
              <select value={form.result} onChange={e => setForm(p => ({ ...p, result: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm`} style={{ background: inputBg, border: inputBorder }}>
                <option value="pass">Pass</option>
                <option value="action_required">Action Required</option>
                <option value="fail">Fail</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                className={`w-full px-3 py-2 rounded-lg ${inputTextCls} text-sm resize-none`} style={{ background: inputBg, border: inputBorder }} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <button type="submit" className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ background: '#e8b130' }}>Save Check</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400" style={{ background: btnGhostBg }}>Cancel</button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Checks list */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : checks.length === 0 ? (
        <div className="text-center text-gray-400 py-12">No checks recorded for this period</div>
      ) : (
        <div className="space-y-2">
          {checks.map(c => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-4 p-4 rounded-xl" style={{ background: tileBg, border: tileBorder }}>
              <div className="flex-shrink-0">{statusIcon(c.result)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`${neutralText} text-sm font-medium`}>{CHECK_TYPES.find(t => t.value === c.check_type)?.label || c.check_type}</span>
                  <span className="text-gray-500 text-xs">— {c.location}</span>
                  <span className={`text-xs font-semibold ${statusColor(c.result)}`}>{resultLabel(c.result)}</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-400">{format(new Date(String(c.check_date).includes('T') ? c.check_date : c.check_date + 'T12:00:00'), 'dd MMM yyyy')}</span>
                  <span className={`text-xs font-medium ${statusColor(c.result)}`}>{c.reading_value} {c.unit}</span>
                  {c.notes && <span className="text-xs text-gray-500 truncate">{c.notes}</span>}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex-shrink-0">{c.recorded_by_name}</div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
