// Print and download helpers for list pages. The browser's own right-click →
// Print produced a blank page on screens built from styled cards, so pages
// that need a paper or spreadsheet copy call these with their own rows.

export type ExportColumn = { key: string; label: string }

const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Opens a clean printable table in a new window; the print dialog can save it as a PDF.
export function printTable(title: string, columns: ExportColumn[], rows: Record<string, any>[], subtitle?: string): boolean {
  const w = window.open('', '_blank')
  if (!w) return false
  const head = columns.map(c => `<th>${esc(c.label)}</th>`).join('')
  const body = rows.map(r => `<tr>${columns.map(c => `<td>${esc(r[c.key])}</td>`).join('')}</tr>`).join('')
  w.document.write(`<!doctype html><html><head><title>${esc(title)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:24px}
    h1{font-size:18px;margin:0 0 4px} p{margin:0 0 12px;color:#555}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f1f5f9} tr{page-break-inside:avoid}
  </style></head><body><h1>${esc(title)}</h1>
  <p>${esc(subtitle || '')}${subtitle ? ' · ' : ''}${rows.length} record${rows.length !== 1 ? 's' : ''} · printed ${esc(new Date().toLocaleString('en-GB'))}</p>
  <table><thead><tr>${head}</tr></thead><tbody>${body || `<tr><td colspan="${columns.length}">No records</td></tr>`}</tbody></table>
  </body></html>`)
  w.document.close()
  w.focus()
  w.print()
  return true
}

// Downloads the rows as a CSV file that opens in Excel.
export function downloadCsv(filename: string, columns: ExportColumn[], rows: Record<string, any>[]): void {
  const cell = (v: any) => `"${String(v ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`
  const lines = [columns.map(c => cell(c.label)).join(','), ...rows.map(r => columns.map(c => cell(r[c.key])).join(','))]
  // BOM so Excel reads accented characters correctly
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
