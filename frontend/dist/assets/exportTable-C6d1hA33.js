const r=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function s(e,a,l,c){const o=window.open("","_blank");if(!o)return!1;const i=a.map(t=>`<th>${r(t.label)}</th>`).join(""),d=l.map(t=>`<tr>${a.map(n=>`<td>${r(t[n.key])}</td>`).join("")}</tr>`).join("");return o.document.write(`<!doctype html><html><head><title>${r(e)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:24px}
    h1{font-size:18px;margin:0 0 4px} p{margin:0 0 12px;color:#555}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f1f5f9} tr{page-break-inside:avoid}
  </style></head><body><h1>${r(e)}</h1>
  <p>${r(c||"")}${c?" · ":""}${l.length} record${l.length!==1?"s":""} · printed ${r(new Date().toLocaleString("en-GB"))}</p>
  <table><thead><tr>${i}</tr></thead><tbody>${d||`<tr><td colspan="${a.length}">No records</td></tr>`}</tbody></table>
  </body></html>`),o.document.close(),o.focus(),o.print(),!0}function h(e,a,l){const c=n=>`"${String(n??"").replace(/"/g,'""').replace(/\r?\n/g," ")}"`,o=[a.map(n=>c(n.label)).join(","),...l.map(n=>a.map(p=>c(n[p.key])).join(","))],i=new Blob(["\uFEFF"+o.join(`\r
`)],{type:"text/csv;charset=utf-8;"}),d=URL.createObjectURL(i),t=document.createElement("a");t.href=d,t.download=e.endsWith(".csv")?e:`${e}.csv`,document.body.appendChild(t),t.click(),document.body.removeChild(t),setTimeout(()=>URL.revokeObjectURL(d),2e3)}export{h as d,s as p};
