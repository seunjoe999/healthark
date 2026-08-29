import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO, startOfWeek } from 'date-fns'
import { esc, fmtDate } from '../../utils/letterheadPrint'

function getWeekCommencing(dateStr: string): string {
  const d = parseISO(dateStr)
  const mon = startOfWeek(d, { weekStartsOn: 1 })
  return mon.toISOString().split('T')[0]
}

function buildWeeks(dates: string[]): Array<{ wc: string; label: string; dates: string[] }> {
  const map: Record<string, string[]> = {}
  for (const d of dates) {
    const wc = getWeekCommencing(d)
    if (!map[wc]) map[wc] = []
    map[wc].push(d)
  }
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([wc, ds]) => ({ wc, label: `W/C: ${format(parseISO(wc), 'd MMM yyyy')}`, dates: ds }))
}

function dayLetter(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE')[0]
}

/* ─── Letterhead print styling (navy-blue, matches Care Plans) ───────────
   This chart is wide tabular data, so the grid itself stays compact/
   sans-serif for density, while the header/footer keep the standard
   navy-blue serif letterhead look. Rendered into a fresh document via
   document.write so it is completely isolated from the app's dark theme
   and the global print.css black-and-white override. */
const MAR_CHART_PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11px;line-height:1.4;background:#fff}
  .page{padding:10mm 10mm 12mm;page-break-after:always}
  .page:last-child{page-break-after:avoid}

  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #132a4f;padding-bottom:8px;margin-bottom:6px}
  .org-name{font-size:14px;font-weight:700;letter-spacing:.01em;color:#132a4f}
  .org-addr{font-size:9px;color:#444;margin-top:2px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9px;color:#444;font-family:Arial,sans-serif;line-height:1.5}
  .doc-meta strong{color:#132a4f}

  .doc-title{font-family:Arial,sans-serif;font-weight:700;font-size:11.5px;color:#132a4f}
  .doc-sub{font-family:Arial,sans-serif;font-size:9.5px;color:#555}

  table.mar-grid{border-collapse:collapse;width:100%;table-layout:fixed;font-family:Arial,sans-serif}
  table.mar-grid th, table.mar-grid td{border:1px solid #999;font-size:8px;padding:2px 3px;text-align:center;vertical-align:top}
  table.mar-grid th{background:#f2f2f0;color:#132a4f;font-weight:700}
  table.mar-grid th.wk{background:#dbe4f0;color:#132a4f;font-size:9px}
  table.mar-grid td.med{text-align:left;font-weight:700;font-size:9px}
  table.mar-grid td.med .dose{font-weight:400;color:#444;font-size:8px}
  table.mar-grid td.dir{text-align:left;font-size:8px;color:#333}
  table.mar-grid tr.sig td{border:1px solid #ccc;height:16px;font-size:7.5px;text-align:left;padding:2px 4px}

  .legend{margin-top:6px;font-family:Arial,sans-serif;font-size:7.5px;color:#333;display:flex;gap:10px;flex-wrap:wrap}

  .footer{margin-top:10px;padding-top:6px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8px;color:#555}
  .footer .confid{font-weight:700;letter-spacing:.05em;color:#132a4f}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0;size:A4 landscape}
  }
`

function buildPrintBody(su: any, medications: any[], dates: string[], startDate: string, endDate: string): string {
  const suName = `${su.first_name || ''} ${su.last_name || ''}`.trim()
  const weeks = buildWeeks(dates)

  const pages = weeks.map((week, idx) => {
    const rows = medications.length === 0
      ? `<tr><td colspan="${3 + week.dates.length}" style="text-align:center;padding:10px;color:#666">No medications recorded</td></tr>`
      : medications.map((med: any) => {
          const slots: string[] = med.time_slots || ['08:00']
          return slots.map((slot: string, si: number) => `
            <tr>
              ${si === 0 ? `<td class="med" rowspan="${slots.length}">${esc(med.medication_name)}${med.dose ? `<div class="dose">${esc(med.dose)}${med.route ? ` · ${esc(med.route)}` : ''}</div>` : ''}${med.is_prn ? '<div class="dose">PRN</div>' : ''}</td>` : ''}
              ${si === 0 ? `<td class="dir" rowspan="${slots.length}">${esc(med.instructions || med.notes)}</td>` : ''}
              <td style="font-weight:700">${slot}</td>
              ${week.dates.map((d: string) => {
                const dayRecs: any[] = med.records?.[d] || []
                const rec = slot === 'PRN'
                  ? dayRecs[0]
                  : dayRecs.find((r: any) => r.scheduled_time === slot) || (dayRecs.length === 1 && !dayRecs[0]?.scheduled_time ? dayRecs[0] : undefined)
                const bg = rec ? (rec.given ? '#d1fae5' : rec.refused ? '#fee2e2' : '#fef9c3') : '#fff'
                const code = rec ? (rec.mar_code || (rec.given ? rec.initials || 'G' : rec.refused ? 'R' : 'O')) : ''
                return `<td style="background:${bg}">${esc(code === '—' ? '' : code)}</td>`
              }).join('')}
            </tr>
          `).join('')
        }).join('')

    return `
    <div class="page">
      <div class="letterhead">
        <div>
          <div class="org-name">Comprehensive Care Ltd</div>
          <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
        </div>
        <div class="doc-meta">
          <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
          <div>Range: ${fmtDate(startDate)} – ${fmtDate(endDate)}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin:6px 0 8px">
        <div>
          <div class="doc-title">${esc(suName)} — Medication Administration Record</div>
          <div class="doc-sub">${su.date_of_birth ? `DOB: ${fmtDate(su.date_of_birth)}` : ''}${su.home_name ? ` · ${esc(su.home_name)}` : ''}${(su.food_allergies || su.allergies) ? ` · Allergies: ${esc([su.food_allergies, su.allergies].filter(Boolean).join(', '))}` : ''}${su.med_allergies ? ` · Med allergies: ${esc(su.med_allergies)}` : ''}</div>
        </div>
        <div class="doc-sub" style="font-weight:700;color:#132a4f">${week.label}</div>
      </div>
      <table class="mar-grid">
        <colgroup><col style="width:150px"/><col style="width:130px"/><col style="width:36px"/>${week.dates.map(() => '<col/>').join('')}</colgroup>
        <thead>
          <tr>
            <th style="text-align:left">Medication</th>
            <th style="text-align:left">Directions</th>
            <th>Time</th>
            ${week.dates.map(d => `<th class="wk">${dayLetter(d)}<br/>${format(parseISO(d), 'd')}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="sig"><td colspan="${3 + week.dates.length}">Initials: _______  Name: ________________________  Signature: ________________________  Role: ____________  Date: __________</td></tr>
        </tbody>
      </table>
      <div class="legend">
        <span><strong>Key:</strong></span>
        <span style="background:#d1fae5;padding:0 3px">G</span> Given
        <span style="background:#fee2e2;padding:0 3px">R</span> Refused
        <span style="background:#fef9c3;padding:0 3px">O</span> Omitted
      </div>
      <div class="footer">
        <span class="confid">CONFIDENTIAL — Resident health record</span>
        <span>Page ${idx + 1} of ${weeks.length}</span>
      </div>
    </div>
    `
  }).join('')

  return pages
}

export default function PrintMARChart() {
  const { suId } = useParams<{ suId: string }>()
  const [params] = useSearchParams()
  const [error, setError] = useState('')
  const [printed, setPrinted] = useState(false)

  useEffect(() => {
    if (!suId) return
    const token =
      (window as any).__HA_TOKEN__ ||
      sessionStorage.getItem('ha_token') ||
      localStorage.getItem('ha_token')
    const startDate = params.get('startDate') || ''
    const endDate = params.get('endDate') || ''
    const qs = new URLSearchParams()
    if (startDate) qs.set('startDate', startDate)
    if (endDate) qs.set('endDate', endDate)
    fetch(`/api/mar/chart-report/${suId}?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (!res.success) throw new Error(res.error || 'Failed')
        const { serviceUser: su, medications, dates, startDate: sd, endDate: ed } = res.data
        const suName = `${su.first_name || ''} ${su.last_name || ''}`.trim()
        const bodyHtml = buildPrintBody(su, medications, dates, sd, ed)
        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${suName || 'Resident'} — MAR</title><style>${MAR_CHART_PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`
        // Write directly into this window's document so the output is
        // completely isolated from the app's dark theme and the global
        // print.css black-and-white override.
        document.open()
        document.write(html)
        document.close()
        setPrinted(true)
        setTimeout(() => window.print(), 300)
      })
      .catch(e => setError(e.message))
  }, [suId, params])

  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error}</div>
  if (!printed) return <div style={{ padding: 32, color: '#666' }}>Generating Medication Administration Record…</div>
  return null
}
