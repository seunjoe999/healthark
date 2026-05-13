import React, { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import toast from 'react-hot-toast'

interface PhotoUploadProps {
  currentUrl?: string | null
  name?: string
  uploadUrl: string
  onUploaded: (url: string) => void
  size?: 'sm' | 'md' | 'lg'
}

export default function PhotoUpload({ currentUrl, name, uploadUrl, onUploaded, size = 'md' }: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = name
    ? name.trim().split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '?'

  const px = { sm: 48, md: 64, lg: 96 }[size]
  const fs = { sm: 14, md: 18, lg: 28 }[size]

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
    setUploading(true)
    try {
      const token = (window as any).__HA_TOKEN__ || sessionStorage.getItem('ha_token') || localStorage.getItem('ha_token')
      const formData = new FormData()
      formData.append('photo', file)
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
    <div style={containerStyle} onClick={() => fileRef.current?.click()} className="group">
      {preview ? (
        <img src={preview} alt={name || ''} style={imgStyle} />
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

      <input ref={fileRef} type="file" style={{ display: 'none' }} accept="image/jpeg,image/png,image/webp" onChange={handleFile} />
    </div>
  )
}
