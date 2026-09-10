// Task descriptions are often typed as a dash-separated checklist
// ("Check vitals - Give medication - Update notes") but rendered as one
// run-on line. Split on " - " / " – " / " — " and give each part its own line.
export default function DashText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\s+[-–—]\s+/).map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return <p className={className}>{text}</p>
  return (
    <ul className={`${className || ''} list-disc list-inside space-y-0.5`}>
      {parts.map((p, i) => <li key={i}>{p}</li>)}
    </ul>
  )
}
