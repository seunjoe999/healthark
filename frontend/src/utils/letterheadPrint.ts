// Shared letterhead print styling — matches Care Plans / Risk Management's
// navy-blue print layout so every clinical assessment tool prints the same
// professional document instead of a raw browser print of the live page.

export const LETTERHEAD_PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11.5px;line-height:1.5;background:#fff}
  .page{max-width:190mm;margin:0 auto;padding:16mm 14mm 20mm;page-break-after:always}
  .page:last-child{page-break-after:avoid}

  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2.5px solid #132a4f;padding-bottom:10px;margin-bottom:4px}
  .org-name{font-size:15px;font-weight:700;letter-spacing:.01em;color:#132a4f}
  .org-addr{font-size:9.5px;color:#444;margin-top:3px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9.5px;color:#444;font-family:Arial,sans-serif;line-height:1.6}
  .doc-meta strong{color:#132a4f}

  .doc-title{text-align:center;margin:20px 0 4px;font-size:19px;font-weight:700;letter-spacing:.02em;color:#132a4f}
  .doc-subtitle{text-align:center;font-size:10px;color:#555;font-family:Arial,sans-serif;text-transform:uppercase;letter-spacing:.09em;margin-bottom:18px}

  table.idtable{width:100%;border-collapse:collapse;margin-bottom:20px;font-family:Arial,sans-serif;font-size:10.5px}
  table.idtable td{border:1px solid #999;padding:6px 10px;vertical-align:top}
  table.idtable td.lbl{width:19%;background:#f2f2f0;font-weight:700;text-transform:uppercase;font-size:8.5px;letter-spacing:.05em;color:#333}
  table.idtable td.val{width:31%;font-size:11px}

  h2.sec{font-family:Arial,sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#132a4f;border-bottom:1px solid #132a4f;padding-bottom:4px;margin:22px 0 10px;page-break-after:avoid}
  h2.sec .num{display:inline-block;width:18px}
  h3.sub{font-family:Arial,sans-serif;font-size:10.5px;font-weight:700;color:#132a4f;margin:12px 0 4px;page-break-after:avoid}
  .body-text{font-size:11px;line-height:1.7;color:#222;white-space:pre-line;margin-bottom:8px}
  .body-text.muted{color:#666;font-style:italic}

  table.fields{width:100%;border-collapse:collapse;margin-bottom:14px;font-family:Arial,sans-serif;font-size:10.5px;page-break-inside:avoid}
  table.fields th{width:38%;text-align:left;background:#f2f2f0;border:1px solid #999;padding:6px 10px;font-weight:700;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#333}
  table.fields td{border:1px solid #999;padding:6px 10px;font-size:11px}
  table.fields tr.on td{font-weight:700}

  .risk-box{border:1.5px solid #132a4f;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:center;font-family:Arial,sans-serif;page-break-inside:avoid}
  .risk-box .rb-label{font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;color:#444}
  .risk-box .rb-value{font-size:14px;font-weight:700;letter-spacing:.03em;text-transform:uppercase}
  .risk-box.high{border-width:2.5px}
  .risk-box.critical{border-width:2.5px;border-style:double}

  .footer{margin-top:28px;padding-top:8px;border-top:1px solid #999;display:flex;justify-content:space-between;font-family:Arial,sans-serif;font-size:8.5px;color:#555}
  .footer .confid{font-weight:700;letter-spacing:.05em}

  @media print{
    body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
    @page{margin:0;size:A4}
    .page{padding:14mm 14mm 16mm}
  }
`

export function fmtDate(d: string | null | undefined): string {
  return d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'
}

export function esc(v: any): string {
  return v === null || v === undefined || v === '' ? '—' : String(v)
}

export function nl(v: any): string {
  return esc(v).replace(/\n/g, '<br/>')
}

export type PrintSection = { title: string; inner: string }

export function buildLetterheadPage(opts: {
  docTitle: string
  docSubtitle: string
  docRefPrefix: string
  docRefId: string | number
  residentName: string
  residentLabel?: string
  extraIdCells?: string
  sections: PrintSection[]
}): string {
  const sectionsHtml = opts.sections.map((s, i) =>
    `<h2 class="sec"><span class="num">${i + 1}.</span>${s.title}</h2>${s.inner}`
  ).join('')

  return `
  <div class="page">
    <div class="letterhead">
      <div>
        <div class="org-name">Comprehensive Care Ltd</div>
        <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
      </div>
      <div class="doc-meta">
        <div>Document ref: ${opts.docRefPrefix}-${esc(opts.docRefId)}</div>
        <div>Printed: <strong>${fmtDate(new Date().toISOString())}</strong></div>
      </div>
    </div>

    <div class="doc-title">${esc(opts.docTitle)}</div>
    <div class="doc-subtitle">${esc(opts.docSubtitle)}</div>

    <table class="idtable">
      <tr>
        <td class="lbl">${esc(opts.residentLabel || 'Resident')}</td><td class="val">${esc(opts.residentName)}</td>
        ${opts.extraIdCells || ''}
      </tr>
    </table>

    ${sectionsHtml}

    <div class="footer">
      <span class="confid">CONFIDENTIAL — Resident health record</span>
      <span>Printed ${fmtDate(new Date().toISOString())}</span>
    </div>
  </div>
  `
}

export function openLetterheadPrint(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${title}</title><style>${LETTERHEAD_PRINT_CSS}</style></head><body>${bodyHtml}</body></html>`
  const w = window.open('', '_blank')
  if (!w) { return false }
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
  return true
}
