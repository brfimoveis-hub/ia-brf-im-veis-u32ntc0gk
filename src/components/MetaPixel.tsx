import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

declare global {
  interface Window {
    fbq: any
    _fbq: any
  }
}

export function MetaPixel() {
  const { user } = useAuth()
  const location = useLocation()
  const pixelId = user?.meta_pixel_id

  useEffect(() => {
    if (!pixelId) return

    if (window.fbq) {
      window.fbq('init', pixelId)
      return
    }

    /* eslint-disable */
    !(function (f, b, e, v, n, t, s) {
      if (f.fbq) return
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments)
      }
      if (!f._fbq) f._fbq = n
      n.push = n
      n.loaded = !0
      n.version = '2.0'
      n.queue = []
      t = b.createElement(e) as HTMLScriptElement
      t.async = !0
      t.src = v
      s = b.getElementsByTagName(e)[0]
      s?.parentNode?.insertBefore(t, s)
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js')
    /* eslint-enable */

    window.fbq('init', pixelId)
  }, [pixelId])

  useEffect(() => {
    if (pixelId && window.fbq) {
      window.fbq('track', 'PageView')
    }
  }, [location.pathname, location.search, pixelId])

  return null
}
