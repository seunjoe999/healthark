import React, { useEffect, useRef, useState } from 'react'
import { Camera, ZoomIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { resolveUploadUrl } from '../../api'
import { Modal, Button } from './index'

interface PhotoUploadProps {
  currentUrl?: string | null
  name?: string
  uploadUrl: string
  onUploaded: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
}

const CROP_BOX = 280
const OUTPUT_SIZE = 512

// WhatsApp-style crop step: drag to reposition, slider to zoom, then the
// visible circle is what gets uploaded — instead of the raw, uncropped
// photo the camera/gallery gave us.
function CropModal({ src, onCancel, onConfirm }: { src: string; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [natural, setNatural] = useState({ w: 0, h: 0 })
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragRef = useRef<{ startX: number; startY: number; offX: number; offY: number } | null>(null)

  const baseScale = natural.w && natural.h ? Math.max(CROP_BOX / natural.w, CROP_BOX / natural.h) : 0
  const displayScale = baseScale * zoom
  const dispW = natural.w * displayScale
  const dispH = natural.h * displayScale

  const clamp = (ox: number, oy: number) => ({
    x: Math.min(0, Math.max(CROP_BOX - dispW, ox)),
    y: Math.min(0, Math.max(CROP_BOX - dispH, oy)),
  })

  const onImgLoad = () => {
    const img = imgRef.current
    if (!img) return
    const w = img.naturalWidth, h = img.naturalHeight
    setNatural({ w, h })
    const bs = Math.max(CROP_BOX / w, CROP_BOX / h)
    setOffset({ x: (CROP_BOX - w * bs) / 2, y: (CROP_BOX - h * bs) / 2 })
  }

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId)
    dragRef.current = { startX: e.clientX, startY: e.clientY, offX: offset.x, offY: offset.y }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setOffset(clamp(dragRef.current.offX + dx, dragRef.current.offY + dy))
  }
  const onPointerUp = () => { dragRef.current = null }

  const changeZoom = (z: number) => {
    if (!natural.w || !natural.h) { setZoom(z); return }
    const bs = Math.max(CROP_BOX / natural.w, CROP_BOX / natural.h)
    const oldScale = bs * zoom
    const newScale = bs * z
    // Keep whatever image point is currently at the crop box's center still
    // centered after the zoom, instead of re-anchoring to the top-left corner.
    const imgCenterX = (CROP_BOX / 2 - offset.x) / oldScale
    const imgCenterY = (CROP_BOX / 2 - offset.y) / oldScale
    const newOffsetX = CROP_BOX / 2 - imgCenterX * newScale
    const newOffsetY = CROP_BOX / 2 - imgCenterY * newScale
    const newDispW = natural.w * newScale
    const newDispH = natural.h * newScale
    setZoom(z)
    setOffset({
      x: Math.min(0, Math.max(CROP_BOX - newDispW, newOffsetX)),
      y: Math.min(0, Math.max(CROP_BOX - newDispH, newOffsetY)),
    })
  }

  const confirm = () => {
    const img = imgRef.current
    if (!img || !natural.w) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const srcX = -offset.x / displayScale
    const srcY = -offset.y / displayScale
    const srcSize = CROP_BOX / displayScale
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    canvas.toBlob(b => { if (b) onConfirm(b) }, 'image/jpeg', 0.92)
  }

  return (
    <Modal open onClose={onCancel} title="Adjust photo" size="sm">
      <div className="flex flex-col items-center gap-4">
        <div
          style={{
            width: CROP_BOX, height: CROP_BOX, borderRadius: '50%', overflow: 'hidden',
            position: 'relative', touchAction: 'none', cursor: 'grab', background: '#000',
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.55)',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          <img
            ref={imgRef}
            src={src}
            alt=""
            draggable={false}
            onLoad={onImgLoad}
            style={{
              position: 'absolute', left: offset.x, top: offset.y,
              width: dispW || 'auto', height: dispH || 'auto',
              maxWidth: 'none', userSelect: 'none', pointerEvents: 'none',
            }}
          />
        </div>

        <div className="flex items-center gap-3 w-full px-2">
          <ZoomIn className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="range" min="1" max="3" step="0.01" value={zoom}
            onChange={e => changeZoom(parseFloat(e.target.value))}
            className="w-full accent-purple-600"
          />
        </div>
        <p className="text-xs text-slate-400 -mt-2">Drag to reposition, use the slider to zoom</p>

        <div className="flex gap-3 w-full">
          <Button variant="outline" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={confirm}>Use photo</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function PhotoUpload({ currentUrl, name, uploadUrl, onUploaded, size = 'md' }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // React reuses this component instance when the parent just swaps props
  // (e.g. clicking from one staff/resident profile to another without a
  // remount) — without this, `preview` stayed stuck on whichever photo was
  // first loaded, so the previous person's picture kept showing.
  useEffect(() => { setPreview(currentUrl || null) }, [currentUrl])

  const initials = name
    ? name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?'

  const px = { sm: 48, md: 64, lg: 96 }[size]
  const fs = { sm: 14, md: 18, lg: 28 }[size]

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setCropSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const uploadCropped = async (blob: Blob) => {
    setCropSrc(null)
    const localUrl = URL.createObjectURL(blob)
    setPreview(localUrl)
    setUploading(true)
    try {
      const token = (window as any).__HA_TOKEN__ || sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token')
      const formData = new FormData()
      formData.append('photo', blob, 'photo.jpg')
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setPreview(data.data.photoUrl)
      onUploaded(data.data.photoUrl)
      toast.success('Photo updated')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
      setPreview(currentUrl || null)
    } finally { setUploading(false) }
  }

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: px,
    height: px,
    minWidth: px,
    minHeight: px,
    maxWidth: px,
    maxHeight: px,
    borderRadius: 16,
    overflow: 'hidden',
    cursor: 'pointer',
    flexShrink: 0,
    background: 'linear-gradient(135deg, #e8b130, #d4961a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0, left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: 'center',
    display: 'block',
  }

  return (
    <>
      <div style={containerStyle} onClick={() => fileRef.current?.click()} className="group">
        {preview ? (
          <img src={resolveUploadUrl(preview)} alt={name || ''} style={imgStyle} />
        ) : (
          <span style={{ fontSize: fs, fontWeight: 700, color: '#151f35', lineHeight: 1, zIndex: 1 }}>
            {initials}
          </span>
        )}

        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2 }}>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, transition: 'background 0.2s' }}
          className="group-hover:!bg-black/40">
          <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" onChange={onPick} />
      </div>

      {cropSrc && (
        <CropModal src={cropSrc} onCancel={() => setCropSrc(null)} onConfirm={uploadCropped} />
      )}
    </>
  )
}
