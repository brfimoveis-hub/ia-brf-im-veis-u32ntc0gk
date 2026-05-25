import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

export const MetaPixel = () => {
  const { pathname } = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    // Falls back to the required pixel if not set
    const pixelId = user?.meta_pixel_id || '950541937872426'

    if (!pixelId) return

    const initPixel = () => {
      if (window.fbq) return

      const script = document.createElement('script')
      script.async = true
      script.src = `https://connect.facebook.net/en_US/fbevents.js`
      document.head.appendChild(script)

      window.fbq = function (...args: any[]) {
        if (window.fbq.callMethod) {
          window.fbq.callMethod(...args)
        } else {
          window.fbq.queue.push(args)
        }
      }
      if (!window._fbq) window._fbq = window.fbq
      window.fbq.push = window.fbq
      window.fbq.loaded = true
      window.fbq.version = '2.0'
      window.fbq.agent = 'tmgoogletagmanager'
      window.fbq.queue = []

      window.fbq('init', pixelId)
    }

    initPixel()

    if (window.fbq) {
      window.fbq('track', 'PageView')
    }
  }, [pathname, user?.meta_pixel_id])

  return null
}
