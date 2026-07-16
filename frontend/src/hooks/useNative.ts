import { useEffect } from 'react'

// Safely detect Capacitor native platform
export const isNativePlatform = (): boolean =>
  !!(window as any).Capacitor?.isNativePlatform?.()

export const getPlatform = (): 'android' | 'ios' | 'web' => {
  const cap = (window as any).Capacitor
  if (!cap?.isNativePlatform?.()) return 'web'
  return cap.getPlatform?.() ?? 'web'
}

// Trigger haptic feedback (no-op on web)
export async function hapticLight() {
  if (!isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {}
}

export async function hapticMedium() {
  if (!isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {}
}

export async function hapticSuccess() {
  if (!isNativePlatform()) return
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
  } catch {}
}
