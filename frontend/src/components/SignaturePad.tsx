import React, { useRef, useState, useEffect } from 'react'
import { RotateCcw, Check } from 'lucide-react'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  label?: string
  savedSignature?: string | null
  disabled?: boolean
}

export default function SignaturePad({ onSave, label, savedSignature, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)
  const [saved, setSaved] = useState(savedSignature || '')
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#f5f0e8'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const touch = e.touches[0]
      return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (disabled || saved) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    setIsDrawing(true)
    lastPos.current = getPos(e, canvas)
  }

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || disabled || saved) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx || !lastPos.current) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPos.current = pos
    setIsEmpty(false)
  }

  const stopDrawing = () => setIsDrawing(false)

  const clear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
    setSaved('')
    lastPos.current = null
  }

  const save = () => {
    const canvas = canvasRef.current
    if (!canvas || isEmpty) return
    const dataUrl = canvas.toDataURL('image/png')
    setSaved(dataUrl)
    onSave(dataUrl)
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-semibold text-slate-600">{label}</p>}

      {saved ? (
        <div className="relative border-2 border-emerald-500/30 rounded-xl overflow-hidden bg-white/5">
          <img src={saved} alt="Signature" className="w-full h-24 object-contain" />
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Signed</span>
          </div>
          {!disabled && (
            <button onClick={clear}
              className="absolute bottom-2 right-2 text-xs text-slate-400 hover:text-rose-500 underline transition-colors">
              Clear & re-sign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-white/20 rounded-xl overflow-hidden hover:border-white/35 transition-colors" style={{ background: '#1a1a1a', touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={120}
              className="w-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {isEmpty && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-xs text-slate-400">Sign here</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={clear} disabled={isEmpty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
            <button onClick={save} disabled={isEmpty}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-40 transition-colors"
              style={{ background: isEmpty ? undefined : 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Check className="w-3.5 h-3.5" /> Confirm signature
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
