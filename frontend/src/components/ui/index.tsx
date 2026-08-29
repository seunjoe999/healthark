import React, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Loader2, AlertTriangle, CheckCircle, Info, X, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import SpeechButtonComponent from './SpeechButton'

// ── Button ────────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'outline' | 'ghost' | 'danger' | 'teal'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed select-none'
  const variants: Record<string, string> = {
    primary: 'bg-white/8 hover:bg-white/12 text-white shadow-sm',
    secondary: 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/15 shadow-sm',
    gold: 'text-slate-900 font-semibold shadow-sm',
    outline: 'bg-transparent hover:bg-white/5 text-slate-300 border border-white/20',
    ghost: 'bg-transparent hover:bg-white/8 text-slate-300',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm',
    teal: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm',
  }
  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  const goldStyle = variant === 'gold' ? { background: 'linear-gradient(135deg, #e8b130 0%, #d4961a 100%)' } : {}

  return (
    <button className={clsx(base, variants[variant], sizes[size], className)}
      style={goldStyle} disabled={loading || props.disabled} {...props}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input className={clsx('input', error && 'border-rose-400 focus:border-rose-400', className)} {...props} />
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-400">{hint}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string; label: string }[]; placeholder?: string
}

export function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select className={clsx('input', error && 'border-rose-400', className)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  )
}

// ── Textarea ──────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string
}

export function Textarea({ label, error, className, onChange, value, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="flex gap-2 items-start">
        <textarea
          className={clsx('input resize-none flex-1', error && 'border-rose-400', className)}
          rows={3}
          value={value}
          onChange={onChange}
          {...props}
        />
        <SpeechButtonComponent
          onTranscript={text => {
            if (onChange) {
              const ev = { target: { value: (value ? `${value} ` : '') + text } } as React.ChangeEvent<HTMLTextAreaElement>
              onChange(ev)
            }
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-rose-500 font-medium">{error}</p>}
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────
export function Toggle({ label, checked, onChange, description, danger }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; description?: string; danger?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={clsx('relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 mt-0.5',
          checked ? (danger ? 'bg-rose-500 focus:ring-rose-400' : 'focus:ring-gold-400') : 'bg-slate-200 focus:ring-slate-300')}
        style={checked && !danger ? { background: 'linear-gradient(135deg, #e8b130, #d4961a)' } : {}}>
        <span className={clsx('inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 m-0.5',
          checked ? 'translate-x-4' : 'translate-x-0')} />
      </button>
      <div>
        <p className="text-sm font-medium text-slate-800 leading-none">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-6', className)}>{children}</div>
}

// ── Status badges ─────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: 'badge-live', pre_admission: 'badge-pre', on_hold: 'badge-hold',
    hospital: 'badge-hospital', archive: 'badge-archive',
  }
  const labels: Record<string, string> = {
    live: 'Live', pre_admission: 'Pre-admission', on_hold: 'On Hold',
    hospital: 'Hospital', archive: 'Archive',
  }
  return <span className={map[status] || 'badge-archive'}>{labels[status] || status}</span>
}

export function EmergencyBadge({ rating }: { rating: string }) {
  const map: Record<string, string> = {
    low: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20',
    medium: 'bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20',
    high: 'bg-rose-500/10 text-rose-600 ring-1 ring-rose-500/20',
  }
  return (
    <span className={clsx('badge capitalize', map[rating] || 'bg-slate-100 text-slate-600')}>
      {rating} risk
    </span>
  )
}

export function AlertSeverityBadge({ severity }: { severity: string }) {
  return <span className={clsx('badge', severity === 'critical' ? 'badge-critical' : severity === 'warning' ? 'badge-warning' : 'badge-info')}>{severity}</span>
}

// ── Loading ───────────────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' }
  return (
    <div className="flex items-center justify-center p-10">
      <div className={clsx('border-2 border-slate-200 border-t-gold-500 rounded-full animate-spin', sizes[size])} />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────
export function EmptyState({ title, description, action }: {
  title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Info className="w-6 h-6 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 mb-5 max-w-xs mx-auto">{description}</p>}
      {action}
    </div>
  )
}

// ── Alert banner ──────────────────────────────────────────────────
export function AlertBanner({ type, message, onClose }: {
  type: 'success' | 'error' | 'warning' | 'info'; message: string; onClose?: () => void
}) {
  const styles = {
    success: { bg: 'bg-emerald-500/8 border-emerald-500/20', text: 'text-emerald-700', icon: <CheckCircle className="w-4 h-4 text-emerald-500" /> },
    error:   { bg: 'bg-rose-500/8 border-rose-500/20',     text: 'text-rose-700',     icon: <AlertTriangle className="w-4 h-4 text-rose-500" /> },
    warning: { bg: 'bg-amber-500/8 border-amber-500/20',   text: 'text-amber-700',   icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
    info:    { bg: 'bg-blue-500/8 border-blue-500/20',     text: 'text-blue-700',     icon: <Info className="w-4 h-4 text-blue-500" /> },
  }
  const { bg, text, icon } = styles[type]
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-xl border', bg)}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <p className={clsx('text-sm flex-1 font-medium', text)}>{message}</p>
      {onClose && <button onClick={onClose} className={clsx('flex-shrink-0 opacity-60 hover:opacity-100', text)}><X className="w-4 h-4" /></button>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
        <div className={clsx('relative rounded-t-2xl sm:rounded-2xl shadow-modal w-full mx-0 sm:mx-4 max-h-[92vh] flex flex-col animate-slide-up', sizes[size])}
          style={{ background: '#111', border: '1px solid rgba(232,177,48,0.2)' }}>
          <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 overflow-y-auto flex-1">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────
export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 pb-4 border-b border-slate-100">
      <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
      {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
    </div>
  )
}

// ── DNAR Banner ───────────────────────────────────────────────────
export function DNARBanner({ dnar, formUrl }: { dnar?: boolean; formUrl?: string }) {
  if (dnar === undefined || dnar === null) return null
  if (!dnar) return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl">
      <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
      <span className="text-emerald-800 font-black text-sm tracking-wide uppercase">CPR: For Resuscitation</span>
    </div>
  )
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-600 border-2 border-rose-700 rounded-xl">
      <AlertTriangle className="w-5 h-5 text-white flex-shrink-0" />
      <span className="text-white font-black text-sm tracking-wide uppercase">DNAR — Do Not Attempt Resuscitation</span>
      {formUrl && <a href={formUrl} target="_blank" rel="noreferrer" className="ml-auto text-xs font-bold text-white/80 underline">View form</a>}
    </div>
  )
}

// ── Nil By Mouth ──────────────────────────────────────────────────
export function NilByMouthBanner({ nilByMouth }: { nilByMouth: boolean }) {
  if (!nilByMouth) return null
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-white font-bold tracking-wide"
      style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
      <AlertTriangle className="w-4 h-4" />
      NIL BY MOUTH — Do not give food or drinks
    </div>
  )
}

export { default as PhotoUpload } from './PhotoUpload'

// ── Print Button ──────────────────────────────────────────────────
import { Printer } from 'lucide-react'

export function PrintButton({ label = 'Print', onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick || (() => window.print())}
      className="no-print inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
      style={{ background: '#1a1a1a', border: '1px solid rgba(232,177,48,0.3)', color: '#e8b130' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#222'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e8b130' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1a1a1a'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(232,177,48,0.3)' }}
    >
      <Printer className="w-4 h-4" />
      {label}
    </button>
  )
}

export { default as SpeechButton } from './SpeechButton'
export { SpeechTextarea } from './SpeechButton'
