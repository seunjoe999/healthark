import { useEffect } from 'react'
import { isNativePlatform, getPlatform } from './useNative'

export function useCapacitorSetup() {
  useEffect(() => {
    if (!isNativePlatform()) return
    ;(async () => {
      try {
        // Status bar — dark bg to match app theme
        const { StatusBar, Style } = await import('@capacitor/status-bar')
        await StatusBar.setStyle({ style: Style.Dark })
        await StatusBar.setBackgroundColor({ color: '#0d1526' })
      } catch {}

      try {
        // Hide splash screen after app has rendered
        const { SplashScreen } = await import('@capacitor/splash-screen')
        await SplashScreen.hide()
      } catch {}

      try {
        // Request push notification permissions
        const { PushNotifications } = await import('@capacitor/push-notifications')
        const permStatus = await PushNotifications.checkPermissions()
        if (permStatus.receive === 'prompt') {
          await PushNotifications.requestPermissions()
        }
        if (permStatus.receive === 'granted') {
          await PushNotifications.register()
        }
      } catch {}
    })()
  }, [])
}
