import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle, AlertCircle, XCircle, ClipboardList, Star } from 'lucide-react';

interface Domain {
  key: string;
  label: string;
  description: string;
  questions: Question[];
}

interface Question {
  id: string;
  text: string;
  category: string;
}

interface Answer { score: 'outstanding' | 'good' | 'requires_improvement' | 'inadequate' | ''; evidence: string; }

const CQC_DOMAINS: Domain[] = [
  {
    key: 'safe',
    label: 'Safe',
    description: 'People are protected from abuse and avoidable harm',
    questions: [
      { id: 's1', text: 'Are safeguarding systems in place and effective?', category: 'Safeguarding' },
      { id: 's2', text: 'Is there a robust system for managing medicines?', category: 'Medicines' },
      { id: 's3', text: 'Are accidents and incidents investigated and acted upon?', category: 'Incidents' },
      { id: 's4', text: 'Are infection prevention and control measures effective?', category: 'IPC' },
      { id: 's5', text: 'Are there enough suitably skilled staff at all times?', category: 'Staffing' },
    ],
  },
  {
    key: 'effective',
    label: 'Effective',
    description: 'Care achieves good outcomes and is based on best evidence',
    questions: [
      { id: 'e1', text: 'Are care plans detailed, up to date and person-centred?', category: 'Care Planning' },
      { id: 'e2', text: 'Are people\'s nutrition and hydration needs met?', category: 'Nutrition' },
      { id: 'e3', text: 'Do staff have the right skills through supervision and training?', category: 'Training' },
      { id: 'e4', text: 'Is consent obtained lawfully and documented?', category: 'Consent' },
      { id: 'e5', text: 'Are healthcare professionals involved appropriately?', category: 'Healthcare' },
    ],
  },
  {
    key: 'caring',
    label: 'Caring',
    description: 'Staff treat people with compassion, kindness, dignity and respect',
    questions: [
      { id: 'c1', text: 'Do staff treat people with kindness and respect?', category: 'Dignity' },
      { id: 'c2', text: 'Are people\'s privacy and dignity maintained?', category: 'Privacy' },
      { id: 'c3', text: 'Are people supported to express their views?', category: 'Empowerment' },
      { id: 'c4', text: 'Are families and carers involved in care decisions?', category: 'Families' },
      { id: 'c5', text: 'Is emotional support provided to residents and families?', category: 'Support' },
    ],
  },
  {
    key: 'responsive',
    label: 'Responsive',
    description: 'Services are organised to meet people\'s needs',
    questions: [
      { id: 'r1', text: 'Are individual needs and preferences assessed and acted upon?', category: 'Individual Needs' },
      { id: 'r2', text: 'Are activities and social opportunities provided?', category: 'Activities' },
      { id: 'r3', text: 'Is the complaints process accessible and effective?', category: 'Complaints' },
      { id: 'r4', text: 'Are end of life care wishes documented and respected?', category: 'End of Life' },
      { id: 'r5', text: 'Is the environment adapted for people\'s needs?', category: 'Environment' },
    ],
  },
  {
    key: 'well_led',
    label: 'Well-Led',
    description: 'Leadership drives a positive culture and continuous improvement',
    questions: [
      { id: 'w1', text: 'Is there a clear vision and values that are embedded?', category: 'Vision' },
      { id: 'w2', text: 'Is there effective governance and quality assurance?', category: 'Governance' },
      { id: 'w3', text: 'Are staff engaged and their feedback acted upon?', category: 'Staff Engagement' },
      { id: 'w4', text: 'Are lessons learned when things go wrong?', category: 'Learning' },
      { id: 'w5', text: 'Is the service working in partnership with external bodies?', category: 'Partnerships' },
    ],
  },
];

const SCORES = [
  { value: 'outstanding', label: 'Outstanding', color: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/40' },
  { value: 'good', label: 'Good', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/40' },
  { value: 'requires_improvement', label: 'Requires Improvement', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/40' },
  { value: 'inadequate', label: 'Inadequate', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/40' },
];

export default function CQCInspection() {
  const [activeDomain, setActiveDomain] = useState('safe');
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [showSummary, setShowSummary] = useState(false);

  const setAnswer = (id: string, field: keyof Answer, value: string) => {
    setAnswers(p => ({ ...p, [id]: { ...(p[id] || { score: '', evidence: '' }), [field]: value } }));
  };

  const domainScore = (domain: Domain) => {
    const qs = domain.questions.map(q => answers[q.id]?.score).filter(Boolean);
    if (qs.length === 0) return null;
    const order = ['outstanding', 'good', 'requires_improvement', 'inadequate'];
    const counts = order.map(s => qs.filter(q => q === s).length);
    const worst = counts.reduceRight((acc, c, i) => c > 0 ? order[i] : acc, '');
    return worst;
  };

  const overallScore = () => {
    const scores = CQC_DOMAINS.map(d => domainScore(d)).filter(Boolean) as string[];
    if (scores.length === 0) return null;
    const order = ['outstanding', 'good', 'requires_improvement', 'inadequate'];
    return order.find(s => scores.includes(s)) || null;
  };

  const scoreInfo = (s: string | null) => SCORES.find(sc => sc.value === s);

  const domain = CQC_DOMAINS.find(d => d.key === activeDomain)!;
  const answered = CQC_DOMAINS.flatMap(d => d.questions).filter(q => answers[q.id]?.score).length;
  const total = CQC_DOMAINS.flatMap(d => d.questions).length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.15)' }}>
            <Shield size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">CQC Mock Inspection</h1>
            <p className="text-sm text-gray-400">Self-assessment across the 5 key questions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSummary(!showSummary)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white"
            style={{ background: showSummary ? 'rgba(255,255,255,0.06)' : '#e8b130' }}>
            <Star size={16} /> {showSummary ? 'Hide Summary' : 'View Summary'}
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="rounded-xl p-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Progress</span>
          <span className="text-white font-medium">{answered}/{total} answered</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <motion.div className="h-full rounded-full" style={{ background: '#e8b130' }}
            initial={{ width: 0 }} animate={{ width: `${(answered / total) * 100}%` }} transition={{ duration: 0.4 }} />
        </div>
      </div>

      {/* Summary */}
      {showSummary && (
        <div className="rounded-xl p-5 space-y-4" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
          <h3 className="text-white font-medium">Overall Assessment</h3>
          {overallScore() && (
            <div className={`p-3 rounded-lg border ${scoreInfo(overallScore())?.bg} ${scoreInfo(overallScore())?.border}`}>
              <span className={`font-bold text-lg ${scoreInfo(overallScore())?.color}`}>{scoreInfo(overallScore())?.label}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {CQC_DOMAINS.map(d => {
              const ds = domainScore(d);
              const info = scoreInfo(ds);
              return (
                <div key={d.key} className={`p-3 rounded-lg text-center border ${info?.bg || 'border-gray-700'} ${info?.border || ''}`}>
                  <div className={`font-medium text-sm ${info?.color || 'text-gray-400'}`}>{d.label}</div>
                  <div className={`text-xs mt-1 ${info?.color || 'text-gray-500'}`}>{info?.label || 'Not assessed'}</div>
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            {CQC_DOMAINS.flatMap(d => d.questions).filter(q => answers[q.id]?.score === 'requires_improvement' || answers[q.id]?.score === 'inadequate').map(q => (
              <div key={q.id} className="flex gap-2 text-sm">
                <AlertCircle size={14} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-gray-300">{q.text}</span>
                  {answers[q.id]?.evidence && <p className="text-xs text-gray-500 mt-0.5">{answers[q.id].evidence}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Domain tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CQC_DOMAINS.map(d => {
          const ds = domainScore(d);
          const info = scoreInfo(ds);
          return (
            <button key={d.key} onClick={() => setActiveDomain(d.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium ${activeDomain === d.key ? 'text-white' : 'text-gray-400'}`}
              style={{ background: activeDomain === d.key ? '#e8b130' : 'rgba(255,255,255,0.06)' }}>
              {d.label}
              {info && <span className={`ml-1 text-xs ${info.color}`}>●</span>}
            </button>
          );
        })}
      </div>

      {/* Domain questions */}
      <div className="rounded-xl p-5 space-y-5" style={{ background: '#111111', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <h3 className="text-white font-medium">{domain.label}</h3>
          <p className="text-sm text-gray-400 mt-1">{domain.description}</p>
        </div>
        {domain.questions.map((q, i) => {
          const ans = answers[q.id] || { score: '', evidence: '' };
          return (
            <div key={q.id} className="space-y-3 pb-5 border-b last:border-0 last:pb-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af' }}>{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-200">{q.text}</p>
                  <span className="text-xs text-gray-500">{q.category}</span>
                </div>
                {ans.score && scoreInfo(ans.score) && (
                  <CheckCircle size={16} className={scoreInfo(ans.score)!.color} />
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SCORES.map(s => (
                  <button key={s.value} onClick={() => setAnswer(q.id, 'score', s.value)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${ans.score === s.value ? `${s.bg} ${s.border} ${s.color}` : 'text-gray-500 border-gray-700 hover:border-gray-500'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
              <input value={ans.evidence} onChange={e => setAnswer(q.id, 'evidence', e.target.value)}
                placeholder="Evidence / notes (optional)" className="w-full px-3 py-2 rounded-lg text-white text-sm"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
