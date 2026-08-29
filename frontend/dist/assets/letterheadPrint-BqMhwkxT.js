const l=`
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Georgia,'Cambria','Times New Roman',serif;color:#1a1a1a;font-size:11.5px;line-height:1.5;background:#fff}
  .page{max-width:190mm;margin:0 auto;padding:16mm 14mm 20mm;page-break-after:always}
  .page:last-child{page-break-after:avoid}

  .letterhead{display:flex;justify-content:space-between;align-items:flex-end;background:#132a4f;padding:12px 16px;margin:-16mm -14mm 4px;border-bottom:3px solid #e8b130}
  .org-name{font-size:15px;font-weight:700;letter-spacing:.01em;color:#fff}
  .org-addr{font-size:9.5px;color:#c9d3e3;margin-top:3px;font-family:Arial,sans-serif}
  .doc-meta{text-align:right;font-size:9.5px;color:#c9d3e3;font-family:Arial,sans-serif;line-height:1.6}
  .doc-meta strong{color:#fff}

  .res-photo{width:58px;height:72px;object-fit:cover;border:1px solid #999;flex-shrink:0}
  .res-photo-fallback{width:58px;height:72px;border:1px solid #999;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;color:#666;font-family:Arial,sans-serif;flex-shrink:0;background:#f2f2f0}
  .res-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:14px 0 4px}

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
`;function n(e){return e?new Date(e).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}):"—"}function i(e){return e==null||e===""?"—":String(e)}function d(e){return i(e).replace(/\n/g,"<br/>")}function p(e){const a=e.sections.map((r,s)=>`<h2 class="sec"><span class="num">${s+1}.</span>${r.title}</h2>${r.inner}`).join(""),o=e.residentPhotoUrl?`<img class="res-photo" src="${e.residentPhotoUrl}" alt="Resident photo" />`:`<div class="res-photo-fallback">${i(e.residentName).charAt(0).toUpperCase()}</div>`,t=`
    <table class="idtable">
      <tr>
        <td class="lbl">${i(e.residentLabel||"Resident")}</td><td class="val">${i(e.residentName)}</td>
        ${e.extraIdCells||""}
      </tr>
    </table>`;return`
  <div class="page">
    <div class="letterhead">
      <div>
        <div class="org-name">Comprehensive Care Ltd</div>
        <div class="org-addr">Ivy Business Centre, Office 3-13 Crown Street, Failsworth, Manchester, M35 9BG</div>
      </div>
      <div class="doc-meta">
        <div>Document ref: ${e.docRefPrefix}-${i(e.docRefId)}</div>
        <div>Printed: <strong>${n(new Date().toISOString())}</strong></div>
      </div>
    </div>

    <div class="doc-title">${i(e.docTitle)}</div>
    <div class="doc-subtitle">${i(e.docSubtitle)}</div>

    <div class="res-head">
      ${o}
      <div style="flex:1">${t}</div>
    </div>

    ${a}

    <div class="footer">
      <span class="confid">CONFIDENTIAL — Resident health record</span>
      <span>Printed ${n(new Date().toISOString())}</span>
    </div>
  </div>
  `}function f(e,a){const o=`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>${e}</title><style>${l}</style></head><body>${a}</body></html>`,t=window.open("","_blank");return t?(t.document.write(o),t.document.close(),t.focus(),t.print(),!0):!1}export{l as L,p as b,i as e,n as f,d as n,f as o};
