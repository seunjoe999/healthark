import React, { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Loader2, AlertTriangle, CheckCircle, Info, X } from 'lucide-react'
import clsx from 'clsx'

// ── Button ───────────────────────────────────────────────────────
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'teal' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-navy-900 hover:bg-navy-800 text-white',
    secondary: 'bg-white hover:bg-gray-50 text-navy-900 border border-gray-200',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    teal: 'bg-teal-500 hover:bg-teal-600 text-white',
    ghost: 'hover:bg-gray-100 text-gray-700',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }
  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ── Input ────────────────────────────────────────────────────────
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input
        className={clsx(
          'input',
          error && 'border-red-400 focus:ring-red-400',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

// ── Select ───────────────────────────────────────────────────────
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <select className={clsx('input', error && 'border-red-400', className)} {...props}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Textarea ─────────────────────────────────────────────────────
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        className={clsx('input resize-none', error && 'border-red-400', className)}
        rows={3}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ── Toggle ───────────────────────────────────────────────────────
interface ToggleProps {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  description?: string
  danger?: boolean
}

export function Toggle({ label, checked, onChange, description, danger }: ToggleProps) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2',
          checked
            ? danger ? 'bg-red-600 focus:ring-red-600' : 'bg-navy-900 focus:ring-navy-900'
            : 'bg-gray-200 focus:ring-gray-300'
        )}
      >
        <span className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200',
          checked ? 'translate-x-5' : 'translate-x-0'
        )} />
      </button>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
    </div>
  )
}

// ── Card ─────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('card p-6', className)}>{children}</div>
}

// ── Badge ────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    live: 'badge-live',
    pre_admission: 'badge-pre',
    on_hold: 'badge-hold',
    hospital: 'badge-hold',
    archive: 'badge-archive',
  }
  const labels: Record<string, string> = {
    live: 'Live',
    pre_admission: 'Pre-admission',
    on_hold: 'On Hold',
    hospital: 'Hospital',
    archive: 'Archive',
  }
  return <span className={map[status] || 'badge-archive'}>{labels[status] || status}</span>
}

export function EmergencyBadge({ rating }: { rating: string }) {
  const map: Record<string, string> = {
    low: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    high: 'bg-red-100 text-red-700',
  }
  return (
    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full capitalize', map[rating] || 'bg-gray-100 text-gray-700')}>
      {rating} risk
    </span>
  )
}

export function AlertSeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'badge-critical',
    warning: 'badge-warning',
    info: 'badge-info',
  }
  return <span className={map[severity] || 'badge-info'}>{severity}</span>
}

// ── Loading spinner ───────────────────────────────────────────────
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className="flex items-center justify-center p-8">
      <Loader2 className={clsx('animate-spin text-navy-900', sizes[size])} />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────
export function EmptyState({ title, description, action }: {
  title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Info className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-base font-medium text-gray-900 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4">{description}</p>}
      {action}
    </div>
  )
}

// ── Alert banner ─────────────────────────────────────────────────
export function AlertBanner({ type, message, onClose }: {
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  onClose?: () => void
}) {
  const config = {
    success: { bg: 'bg-green-50 border-green-200', text: 'text-green-800', icon: <CheckCircle className="w-4 h-4 text-green-600" /> },
    error: { bg: 'bg-red-50 border-red-200', text: 'text-red-800', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
    warning: { bg: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800', icon: <AlertTriangle className="w-4 h-4 text-yellow-600" /> },
    info: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', icon: <Info className="w-4 h-4 text-blue-600" /> },
  }
  const { bg, text, icon } = config[type]
  return (
    <div className={clsx('flex items-start gap-3 p-4 rounded-lg border', bg)}>
      <div className="flex-shrink-0 mt-0.5">{icon}</div>
      <p className={clsx('text-sm flex-1', text)}>{message}</p>
      {onClose && (
        <button onClick={onClose} className={clsx('flex-shrink-0', text)}>
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className={clsx('relative bg-white rounded-xl shadow-xl w-full', sizes[size])}>
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-navy-900">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────
export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6 pb-4 border-b border-gray-100">
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
    </div>
  )
}

// ── DNAR Banner — always visible when DNAR is set ─────────────────
export function DNARBanner({ dnar, formUrl }: { dnar?: boolean; formUrl?: string }) {
  if (dnar === undefined || dnar === null) return null
  if (!dnar) return (
    <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
      <CheckCircle className="w-4 h-4 text-green-600" />
      <span className="font-medium">CPR: Resuscitate</span>
    </div>
  )
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
      <AlertTriangle className="w-4 h-4 text-red-600" />
      <span className="font-medium">DNAR — Do Not Attempt Resuscitation</span>
      {formUrl && (
        <a href={formUrl} target="_blank" rel="noreferrer" className="ml-2 underline text-red-700 text-xs">
          View DNAR form
        </a>
      )}
    </div>
  )
}

// ── Nil by mouth banner ───────────────────────────────────────────
export function NilByMouthBanner({ nilByMouth }: { nilByMouth: boolean }) {
  if (!nilByMouth) return null
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg text-sm text-white font-semibold">
      <AlertTriangle className="w-4 h-4" />
      NIL BY MOUTH — Do not give food or drinks
    </div>
  )
}
