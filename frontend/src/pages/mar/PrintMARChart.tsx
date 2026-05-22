import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO, startOfWeek, addDays } from 'date-fns'

// Matches the UK "W/C: DD Mon YYYY" grouping used by RoundSys
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
    .map(([wc, ds]) => ({
      wc,
      label: `W/C: ${format(parseISO(wc), 'd MMM yyyy')}`,
      dates: ds,
    }))
}

function dayInitial(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE')[0] // M T W T F S S
}

const CELL: React.CSSProperties = {
  border: '1px solid #999',
  textAlign: 'center',
  fontSize: '9px',
  padding: '1px',
  verticalAlign: 'top',
  minWidth: '28px',
  maxWidth: '28px',
  width: '28px',
}

const TH: React.CSSProperties = {
  ...CELL,
  fontWeight: 'bold',
  backgroundColor: '#e8e8e8',
}

export default function PrintMARChart() {
  const { suId } = useParams<{ suId: string }>()
  const [params] = useSearchParams()
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')

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
        setData(res.data)
        setTimeout(() => window.print(), 1000)
      })
      .catch(e => setError(e.message))
  }, [suId, params])

  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error}</div>
  if (!data) return <div style={{ padding: 32, color: '#666' }}>Generating MAR chart…</div>

  const { serviceUser: su, medications, dates, startDate, endDate } = data
  const suName = `${su.first_name || ''} ${su.last_name || ''}`.trim()
  const weeks = buildWeeks(dates)

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', backgroundColor: '#fff', padding: '8px' }}>
      <style>{`
        @media print {
          @page { size: A3 landscape; margin: 8mm; }
          body { margin: 0; }
        }
        table { border-collapse: collapse; width: 100%; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ border: '2px solid #333', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          {/* SU Info */}
          <div style={{ flex: 1, padding: '6px 10px', borderRight: '1px solid #ccc' }}>
            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{suName}</div>
            {su.date_of_birth && (
              <div style={{ fontSize: 10, color: '#444' }}>
                DOB: {format(parseISO(su.date_of_birth), 'd MMM yyyy')}
              </div>
            )}
            {(su.food_allergies || su.allergies) && (
              <div style={{ fontSize: 9, marginTop: 3 }}>
                <span style={{ fontWeight: 'bold' }}>Allergies/Notes:</span>{' '}
                {[su.food_allergies, su.allergies].filter(Boolean).join(', ')}
              </div>
            )}
            {su.med_allergies && (
              <div style={{ fontSize: 9 }}>
                <span style={{ fontWeight: 'bold' }}>Medicine Allergies:</span> {su.med_allergies}
              </div>
            )}
            {su.special_diet && (
              <div style={{ fontSize: 9 }}>
                <span style={{ fontWeight: 'bold' }}>Main Diet:</span> {su.special_diet}
              </div>
            )}
          </div>
          {/* Provider / Date range */}
          <div style={{ padding: '6px 10px', textAlign: 'right', minWidth: 200 }}>
            <div style={{ fontSize: 10, fontWeight: 'bold' }}>
              {su.home_name || 'CompCare Hub'}
            </div>
            {su.home_address && <div style={{ fontSize: 9 }}>{su.home_address}</div>}
            {su.home_postcode && <div style={{ fontSize: 9 }}>{su.home_postcode}</div>}
            <div style={{ fontSize: 9, marginTop: 4 }}>
              <span style={{ fontWeight: 'bold' }}>Date Range:</span>{' '}
              {format(parseISO(startDate), 'd MMM yyyy')} – {format(parseISO(endDate), 'd MMM yyyy')}
            </div>
            <div style={{ fontSize: 9 }}>Printed: {format(new Date(), 'd MMM yyyy, HH:mm')}</div>
          </div>
        </div>
      </div>

      {/* ── Chart Title ─────────────────────────────────────────────── */}
      <div style={{ fontWeight: 'bold', fontSize: 12, textAlign: 'center', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
        Medicine Administration Report (MAR Chart)
      </div>

      {/* ── MAR Table ───────────────────────────────────────────────── */}
      <table>
        <thead>
          {/* Week header row */}
          <tr>
            <th style={{ ...TH, width: 160, maxWidth: 160 }}>Medication</th>
            <th style={{ ...TH, width: 120, maxWidth: 120 }}>Directions</th>
            <th style={{ ...TH, width: 40, maxWidth: 40 }}>TIME</th>
            {weeks.map(w => (
              <th
                key={w.wc}
                colSpan={w.dates.length}
                style={{ ...TH, backgroundColor: '#ccc' }}
              >
                {w.label}
              </th>
            ))}
          </tr>
          {/* Day-of-week + date number row */}
          <tr>
            <th style={TH} />
            <th style={TH} />
            <th style={TH} />
            {dates.map((d: string) => (
              <th key={d} style={{ ...TH, fontSize: 8 }}>
                <div>{dayInitial(d)}</div>
                <div>{format(parseISO(d), 'd')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.length === 0 ? (
            <tr>
              <td colSpan={3 + dates.length} style={{ textAlign: 'center', padding: 16, color: '#666' }}>
                No medications recorded
              </td>
            </tr>
          ) : (
            medications.map((med: any) =>
              med.time_slots.map((slot: string, slotIdx: number) => (
                <tr key={`${med.id}-${slot}`}>
                  {/* Medication name — only on first time slot row */}
                  {slotIdx === 0 ? (
                    <td
                      rowSpan={med.time_slots.length}
                      style={{
                        border: '1px solid #999',
                        fontSize: 9,
                        padding: '2px 3px',
                        verticalAlign: 'top',
                        fontWeight: 'bold',
                        width: 160,
                        maxWidth: 160,
                      }}
                    >
                      <div>{med.medication_name}</div>
                      {med.dose && <div style={{ fontWeight: 'normal', color: '#444' }}>{med.dose}</div>}
                      {med.prescribed_by && (
                        <div style={{ fontWeight: 'normal', color: '#666', fontSize: 8 }}>
                          Rx: {med.prescribed_by}
                        </div>
                      )}
                      {med.is_prn && (
                        <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: 8, padding: '0 3px', borderRadius: 2 }}>
                          PRN
                        </span>
                      )}
                    </td>
                  ) : null}
                  {/* Directions — only on first row */}
                  {slotIdx === 0 ? (
                    <td
                      rowSpan={med.time_slots.length}
                      style={{
                        border: '1px solid #999',
                        fontSize: 8,
                        padding: '2px 3px',
                        verticalAlign: 'top',
                        width: 120,
                        maxWidth: 120,
                        color: '#222',
                      }}
                    >
                      {med.instructions || med.notes || '—'}
                    </td>
                  ) : null}
                  {/* Time slot */}
                  <td style={{ ...CELL, fontSize: 8, fontWeight: 'bold', backgroundColor: '#f5f5f5' }}>
                    {slot}
                  </td>
                  {/* Per-day cells */}
                  {dates.map((d: string) => {
                    const dayRecords: any[] = med.records[d] || []
                    // Find record for this time slot (or any record if PRN)
                    const rec = slot === 'PRN'
                      ? dayRecords[0]
                      : dayRecords.find((r: any) => r.scheduled_time === slot) || dayRecords.find((r: any) => !r.scheduled_time)
                    const cellBg = rec
                      ? rec.given ? '#d1fae5' : rec.refused ? '#fee2e2' : '#fef9c3'
                      : '#fff'
                    return (
                      <td key={d} style={{ ...CELL, backgroundColor: cellBg, lineHeight: '1.1' }}>
                        {rec ? (
                          <>
                            <div style={{ fontWeight: 'bold', fontSize: 8 }}>
                              {rec.given ? (rec.initials || '✓') : rec.refused ? 'X' : '—'}
                            </div>
                            {rec.given_at && (
                              <div style={{ fontSize: 7, color: '#555' }}>
                                {rec.given_at ? format(new Date(rec.given_at), 'HH:mm') : ''}
                              </div>
                            )}
                          </>
                        ) : null}
                      </td>
                    )
                  })}
                </tr>
              ))
            )
          )}
        </tbody>
      </table>

      {/* ── Legend ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 8, fontSize: 8, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <span><strong>Key:</strong></span>
        <span><span style={{ backgroundColor: '#d1fae5', padding: '0 4px' }}>Initials</span> = Given</span>
        <span><span style={{ backgroundColor: '#fee2e2', padding: '0 4px' }}>X</span> = Refused / Missed</span>
        <span><span style={{ backgroundColor: '#fef9c3', padding: '0 4px' }}>—</span> = Omitted</span>
        <span>PRN = As Required</span>
        <span style={{ marginLeft: 'auto', color: '#666' }}>Generated by CompCare Hub</span>
      </div>

      {/* ── Signature strip ─────────────────────────────────────────── */}
      <div style={{ marginTop: 12, border: '1px solid #ccc', padding: 6 }}>
        <div style={{ fontWeight: 'bold', fontSize: 9, marginBottom: 4 }}>Staff Signature Record</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ border: '1px solid #ddd', padding: '3px 6px', fontSize: 8, minHeight: 24 }}>
              <div>Initials: ______ Name: ___________________________</div>
              <div>Signature: ____________________________ Role: _________</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
