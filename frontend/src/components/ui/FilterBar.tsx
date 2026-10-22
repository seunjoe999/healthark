import React from 'react'
import { Search, X, Filter } from 'lucide-react'

export interface FilterSelectOption {
  value: string
  label: string
}

export interface ExtraFilterField {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: FilterSelectOption[]
  allLabel?: string
}

export interface UniformFilterBarProps {
  /** Primary person selector label ("Service User" or "Staff Member") */
  personLabel?: string
  personAllLabel?: string
  personValue?: string
  onPersonChange?: (value: string) => void
  personOptions?: FilterSelectOption[]
  /** Text search input */
  searchPlaceholder?: string
  searchValue: string
  onSearchChange: (value: string) => void
  /** Date range filter */
  dateFromLabel?: string
  dateFrom: string
  onDateFromChange: (value: string) => void
  dateToLabel?: string
  dateTo: string
  onDateToChange: (value: string) => void
  /** Optional status / session / category dropdowns */
  extraSelects?: ExtraFilterField[]
  /** Clear callback */
  onClear: () => void
  /** Optional count summary */
  shownCount?: number
  totalCount?: number
  className?: string
}

export function UniformFilterBar({
  personLabel,
  personAllLabel = 'All Service Users',
  personValue = '',
  onPersonChange,
  personOptions = [],
  searchPlaceholder = 'Search name, notes, details...',
  searchValue,
  onSearchChange,
  dateFromLabel = 'Date From',
  dateFrom,
  onDateFromChange,
  dateToLabel = 'Date To',
  dateTo,
  onDateToChange,
  extraSelects = [],
  onClear,
  shownCount,
  totalCount,
  className = '',
}: UniformFilterBarProps) {
  const hasActiveFilter = Boolean(
    personValue ||
    searchValue.trim() ||
    dateFrom ||
    dateTo ||
    extraSelects.some(s => Boolean(s.value))
  )

  return (
    <div className={`bg-white text-slate-900 rounded-2xl border border-slate-200 p-4 shadow-sm print:hidden ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
          <Filter className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
          <span>Filter Records</span>
          {shownCount !== undefined && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold normal-case tracking-normal">
              {totalCount !== undefined && totalCount !== shownCount
                ? `Showing ${shownCount} of ${totalCount}`
                : `${shownCount} record${shownCount === 1 ? '' : 's'}`}
            </span>
          )}
        </div>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        {onPersonChange && (
          <div className="lg:col-span-3">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1 block">
              {personLabel || 'Service User'}
            </label>
            <select
              className="input w-full text-sm text-slate-900 bg-white"
              value={personValue}
              onChange={e => onPersonChange(e.target.value)}
            >
              <option value="">{personAllLabel}</option>
              {personOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        <div className={onPersonChange ? 'lg:col-span-3' : 'lg:col-span-5'}>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1 block">
            Search
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              className="input w-full pl-9 pr-8 text-sm text-slate-900 bg-white"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={e => onSearchChange(e.target.value)}
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className={extraSelects.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1 block">
            {dateFromLabel}
          </label>
          <input
            type="date"
            className="input w-full text-sm text-slate-900 bg-white"
            value={dateFrom}
            onChange={e => onDateFromChange(e.target.value)}
          />
        </div>

        <div className={extraSelects.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1 block">
            {dateToLabel}
          </label>
          <input
            type="date"
            className="input w-full text-sm text-slate-900 bg-white"
            value={dateTo}
            onChange={e => onDateToChange(e.target.value)}
          />
        </div>

        {extraSelects.map(sel => (
          <div key={sel.id} className="lg:col-span-2">
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-1 block">
              {sel.label}
            </label>
            <select
              className="input w-full text-sm text-slate-900 bg-white"
              value={sel.value}
              onChange={e => sel.onChange(e.target.value)}
            >
              <option value="">{sel.allLabel || `All ${sel.label}`}</option>
              {sel.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}
