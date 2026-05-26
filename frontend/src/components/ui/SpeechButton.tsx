import React, { useState, useRef, useCallback } from 'react'
import { Mic, MicOff, Square } from 'lucide-react'

interface SpeechButtonProps {
  onTranscript: (text: string) => void
  className?: string
}

declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
  }
}

export default function SpeechButton({ onTranscript, className = '' }: SpeechButtonProps) {
  const [listening, setListening] = useState(false)
  const [supported] = useState(() => !!(window.SpeechRecognition || window.webkitSpeechRecognition))
  const recRef = useRef<any>(null)

  const start = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = false
    rec.lang = 'en-GB'
    rec.onresult = (e: any) => {
      const text = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join(' ')
      onTranscript(text)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    rec.start()
    recRef.current = rec
    setListening(true)
  }, [onTranscript])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setListening(false)
  }, [])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={listening ? stop : start}
      title={listening ? 'Stop recording' : 'Start speech-to-text'}
      className={`flex-shrink-0 p-2 rounded-lg transition-all ${listening
        ? 'bg-red-500 text-white animate-pulse'
        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
      } ${className}`}
    >
      {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
    </button>
  )
}

export function SpeechTextarea({
  label, value, onChange, rows = 3, placeholder, required, className = '',
}: {
  label?: string; value: string; onChange: (v: string) => void;
  rows?: number; placeholder?: string; required?: boolean; className?: string
}) {
  return (
    <div>
      {label && <label className="label">{label}{required && ' *'}</label>}
      <div className="flex gap-2 items-start">
        <textarea
          className={`input flex-1 ${className}`}
          rows={rows}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
        <SpeechButton onTranscript={text => onChange(value ? `${value} ${text}` : text)} />
      </div>
    </div>
  )
}
