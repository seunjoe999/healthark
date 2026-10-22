import React, { useRef, useState, useEffect } from 'react'
import { RotateCcw, Check } from 'lucide-react'

/**
 * Normalizes any saved signature data URL so light/off-white strokes (#f5f0e8)
 * captured on legacy dark canvases render in crisp dark navy ink (#0f172a) on
 * clean white backgrounds (and print cleanly on paper).
 */
export function useNormalizedSignature(src?: string | null): string {
  const [normalized, setNormalized] = useState<string>(src || '')

  useEffect(() => {
    if (!src) {
      setNormalized('')
      return
    }
    if (!src.startsWith('data:image/')) {
      setNormalized(src)
      return
    }
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 600
        canvas.height = img.naturalHeight || 120
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          if (!cancelled) setNormalized(src)
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const d = imageData.data
        let visibleCount = 0
        let lumSum = 0
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 20) {
            visibleCount++
            lumSum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
          }
        }
        // If strokes are pale/off-white (average luminance > 155), re-ink to deep slate #0f172a
        if (visibleCount > 0 && lumSum / visibleCount > 155) {
          for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 8) {
              d[i] = 15
              d[i + 1] = 23
              d[i + 2] = 42
              d[i + 3] = Math.min(255, Math.round(d[i + 3] * 1.25))
            }
          }
          ctx.putImageData(imageData, 0, 0)
          if (!cancelled) setNormalized(canvas.toDataURL('image/png'))
          return
        }
        if (!cancelled) setNormalized(src)
      } catch {
        if (!cancelled) setNormalized(src)
      }
    }
    img.onerror = () => {
      if (!cancelled) setNormalized(src)
    }
    img.src = src
    return () => { cancelled = true }
  }, [src])

  return normalized
}

export function SignatureImage({ src, alt = 'Signature', className = 'w-full h-16 object-contain' }: {
  src: string
  alt?: string
  className?: string
}) {
  const displaySrc = useNormalizedSignature(src)
  if (!displaySrc) return null
  return <img src={displaySrc} alt={alt} className={className} />
}

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
  const displaySaved = useNormalizedSignature(saved)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    setSaved(savedSignature || '')
  }, [savedSignature])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [saved])

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
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
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
    if (canvas) {
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    setIsEmpty(true)
    setSaved('')
    onSave('')
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
      {label && <p className="text-sm font-semibold text-slate-700">{label}</p>}

      {saved ? (
        <div className="relative border-2 border-emerald-500/40 rounded-xl overflow-hidden bg-white shadow-sm">
          <img src={displaySaved} alt="Signature" className="w-full h-24 object-contain p-2 bg-white" />
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Signed</span>
          </div>
          {!disabled && (
            <button type="button" onClick={clear}
              className="absolute bottom-2 right-2 text-xs text-slate-500 hover:text-rose-600 underline transition-colors">
              Clear &amp; re-sign
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden hover:border-purple-400 transition-colors bg-white" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={120}
              className="w-full cursor-crosshair bg-white"
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
                <p className="text-xs text-slate-400">Sign here in dark ink</p>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={clear} disabled={isEmpty}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 transition-colors">
              <RotateCcw className="w-3.5 h-3.5" /> Clear
            </button>
            <button type="button" onClick={save} disabled={isEmpty}
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
