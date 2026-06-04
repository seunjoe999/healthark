import React, { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { format, parseISO, startOfWeek } from 'date-fns'

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

function dayInitial(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE')[0]
}

const BASE_CELL: React.CSSProperties = {
  border: '1px solid #999',
  textAlign: 'center',
  fontSize: '8px',
  padding: '1px',
  verticalAlign: 'top',
  width: '36px',
  minWidth: '36px',
  maxWidth: '36px',
}

const TH: React.CSSProperties = { ...BASE_CELL, fontWeight: 'bold', backgroundColor: '#e0e0e0' }

interface WeekTableProps {
  week: { wc: string; label: string; dates: string[] }
  medications: any[]
  su: any
  startDate: string
  endDate: string
  isLast: boolean
}

function WeekTable({ week, medications, su, startDate, endDate, isLast }: WeekTableProps) {
  const suName = `${su.first_name || ''} ${su.last_name || ''}`.trim()
  return (
    <div style={{ pageBreakAfter: isLast ? 'avoid' : 'always', marginBottom: isLast ? 0 : 0 }}>
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4, borderBottom: '2px solid #333', paddingBottom: 4 }}>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 13 }}>{suName}</div>
          {su.date_of_birth && <div style={{ fontSize: 9 }}>DOB: {format(parseISO(su.date_of_birth), 'd MMM yyyy')}</div>}
          {(su.food_allergies || su.allergies) && (
            <div style={{ fontSize: 8 }}><strong>Allergies:</strong> {[su.food_allergies, su.allergies].filter(Boolean).join(', ')}</div>
          )}
          {su.med_allergies && <div style={{ fontSize: 8 }}><strong>Med allergies:</strong> {su.med_allergies}</div>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 9 }}>
          <div style={{ fontWeight: 'bold', fontSize: 11 }}>MEDICATION ADMINISTRATION RECORD</div>
          <div>{su.home_name || ''}</div>
          <div style={{ fontWeight: 'bold', fontSize: 10 }}>{week.label}</div>
          <div>Range: {format(parseISO(startDate), 'd MMM yyyy')} – {format(parseISO(endDate), 'd MMM yyyy')}</div>
          <div style={{ color: '#666' }}>Printed: {format(new Date(), 'd MMM yyyy, HH:mm')}</div>
        </div>
      </div>

      {/* MAR Table */}
      <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '160px' }} />
          <col style={{ width: '140px' }} />
          <col style={{ width: '48px' }} />
          {week.dates.map(d => <col key={d} />)}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: 'left', padding: '2px 4px', backgroundColor: '#ccc' }}>Medication</th>
            <th style={{ ...TH, textAlign: 'left', padding: '2px 4px', backgroundColor: '#ccc' }}>Directions</th>
            <th style={{ ...TH, backgroundColor: '#ccc' }}>Time</th>
            {week.dates.map(d => (
              <th key={d} style={{ ...TH, fontSize: 7, backgroundColor: '#dbeafe' }}>
                <div>{dayInitial(d)}</div>
                <div>{format(parseISO(d), 'd')}</div>
                <div style={{ fontSize: 6, color: '#555' }}>{format(parseISO(d), 'MMM')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {medications.length === 0 ? (
            <tr>
              <td colSpan={3 + week.dates.length} style={{ textAlign: 'center', padding: 12, color: '#666', fontSize: 10 }}>
                No medications recorded
              </td>
            </tr>
          ) : medications.map((med: any) =>
            med.time_slots.map((slot: string, slotIdx: number) => (
              <tr key={`${med.id}-${slot}`} style={{ backgroundColor: slotIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                {slotIdx === 0 && (
                  <td rowSpan={med.time_slots.length} style={{
                    border: '1px solid #999', fontSize: 9, padding: '2px 4px',
                    verticalAlign: 'top', fontWeight: 'bold', wordBreak: 'break-word',
                  }}>
                    <div>{med.medication_name}</div>
                    {med.dose && <div style={{ fontWeight: 'normal', color: '#444', fontSize: 8 }}>{med.dose}</div>}
                    {med.route && <div style={{ fontWeight: 'normal', color: '#666', fontSize: 8 }}>{med.route}</div>}
                    {med.prescribed_by && <div style={{ fontWeight: 'normal', color: '#888', fontSize: 7 }}>Rx: {med.prescribed_by}</div>}
                    {med.is_prn && <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: 7, padding: '0 3px', borderRadius: 2 }}>PRN</span>}
                  </td>
                )}
                {slotIdx === 0 && (
                  <td rowSpan={med.time_slots.length} style={{
                    border: '1px solid #999', fontSize: 8, padding: '2px 4px',
                    verticalAlign: 'top', color: '#222', wordBreak: 'break-word',
                  }}>
                    {med.instructions || med.notes || '—'}
                  </td>
                )}
                <td style={{ ...BASE_CELL, fontWeight: 'bold', fontSize: 8, backgroundColor: '#f1f5f9' }}>{slot}</td>
                {week.dates.map((d: string) => {
                  const dayRecs: any[] = med.records[d] || []
                  const rec = slot === 'PRN'
                    ? dayRecs[0]
                    : dayRecs.find((r: any) => r.scheduled_time === slot) || (dayRecs.length === 1 && !dayRecs[0]?.scheduled_time ? dayRecs[0] : undefined)
                  const bg = rec
                    ? rec.given ? '#d1fae5' : rec.refused ? '#fee2e2' : '#fef9c3'
                    : '#fff'
                  return (
                    <td key={d} style={{ ...BASE_CELL, backgroundColor: bg }}>
                      {rec && (
                        <>
                          <div style={{ fontWeight: 'bold', fontSize: 8 }}>
                            {rec.mar_code || (rec.given ? rec.initials || 'G' : rec.refused ? 'R' : '—')}
                          </div>
                          {rec.given_by_name && <div style={{ fontSize: 6, color: '#555' }}>{rec.initials || ''}</div>}
                        </>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
          {/* Signature rows */}
          {[...Array(3)].map((_, i) => (
            <tr key={`sig-${i}`}>
              <td colSpan={3 + week.dates.length} style={{ border: '1px solid #ccc', fontSize: 8, padding: '2px 4px', height: 18 }}>
                {i === 0 ? 'Initials: _______ Name: _________________________ Signature: _________________________ Role: _____________ Date: _________' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div style={{ marginTop: 4, fontSize: 7, display: 'flex', gap: 12, flexWrap: 'wrap', color: '#333' }}>
        <span><strong>Key:</strong></span>
        <span><span style={{ background: '#d1fae5', padding: '0 3px' }}>G</span> Given</span>
        <span><span style={{ background: '#d1fae5', padding: '0 3px' }}>SM</span> Self/assisted</span>
        <span><span style={{ background: '#fee2e2', padding: '0 3px' }}>R</span> Refused</span>
        <span><span style={{ background: '#fef9c3', padding: '0 3px' }}>O</span> Omitted</span>
        <span><span style={{ background: '#fef9c3', padding: '0 3px' }}>NT</span> Not taken</span>
        <span><span style={{ background: '#f3f4f6', padding: '0 3px' }}>NR</span> Not required</span>
        <span><span style={{ background: '#f3f4f6', padding: '0 3px' }}>N</span> Not available</span>
        <span><span style={{ background: '#fee2e2', padding: '0 3px' }}>E</span> Error</span>
        <span style={{ marginLeft: 'auto', color: '#999' }}>CompCare Hub</span>
      </div>
    </div>
  )
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
        setTimeout(() => window.print(), 800)
      })
      .catch(e => setError(e.message))
  }, [suId, params])

  if (error) return <div style={{ padding: 32, color: 'red' }}>Error: {error}</div>
  if (!data) return <div style={{ padding: 32, color: '#666' }}>Generating Medication Administration Record…</div>

  const { serviceUser: su, medications, dates, startDate, endDate } = data
  const weeks = buildWeeks(dates)

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', backgroundColor: '#fff' }}>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        * { box-sizing: border-box; }
      `}</style>

      {weeks.map((week, idx) => (
        <WeekTable
          key={week.wc}
          week={week}
          medications={medications}
          su={su}
          startDate={startDate}
          endDate={endDate}
          isLast={idx === weeks.length - 1}
        />
      ))}
    </div>
  )
}
