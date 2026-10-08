const l=e=>String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");function s(e,a,r,d){const o=window.open("","_blank");if(!o)return!1;const i=a.map(t=>`<th>${l(t.label)}</th>`).join(""),c=r.map(t=>`<tr>${a.map(n=>`<td>${l(t[n.key])}</td>`).join("")}</tr>`).join("");return o.document.write(`<!doctype html><html><head><title>${l(e)}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:24px}
    h1{font-size:18px;margin:0 0 4px} p{margin:0 0 12px;color:#555}
    table{border-collapse:collapse;width:100%} th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;vertical-align:top}
    th{background:#f1f5f9} tr{page-break-inside:avoid}
  </style></head><body><h1>${l(e)}</h1>
  <p>${l("")}${r.length} record${r.length!==1?"s":""} · printed ${l(new Date().toLocaleString("en-GB"))}</p>
  <table><thead><tr>${i}</tr></thead><tbody>${c||`<tr><td colspan="${a.length}">No records</td></tr>`}</tbody></table>
  </body></html>`),o.document.close(),o.focus(),o.print(),!0}function b(e,a,r){const d=n=>`"${String(n??"").replace(/"/g,'""').replace(/\r?\n/g," ")}"`,o=[a.map(n=>d(n.label)).join(","),...r.map(n=>a.map(p=>d(n[p.key])).join(","))],i=new Blob(["\uFEFF"+o.join(`\r
`)],{type:"text/csv;charset=utf-8;"}),c=URL.createObjectURL(i),t=document.createElement("a");t.href=c,t.download=e.endsWith(".csv")?e:`${e}.csv`,document.body.appendChild(t),t.click(),document.body.removeChild(t),setTimeout(()=>URL.revokeObjectURL(c),2e3)}export{b as d,s as p};
