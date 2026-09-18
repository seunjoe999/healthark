// Task descriptions are often typed as a dash-separated checklist
// ("Check vitals - Give medication - Update notes") but rendered as one
// run-on line. Split on " - " / " – " / " — " and give each part its own line.
export default function DashText({ text, className }: { text: string; className?: string }) {
  // Split on dash-separated items on the same line, or on real line breaks
  // (whichever the text actually uses), and strip any leading bullet dash.
  const parts = text
    .split(/\r?\n|\s+[-–—]\s+/)
    .map(p => p.trim().replace(/^[-–—]\s*/, ''))
    .filter(Boolean)
  if (parts.length <= 1) return <p className={`${className || ''} whitespace-pre-line`}>{text}</p>
  return (
    <ul className={`${className || ''} list-disc list-inside space-y-0.5`}>
      {parts.map((p, i) => <li key={i}>{p}</li>)}
    </ul>
  )
}
