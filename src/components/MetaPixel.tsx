import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

declare global {
  interface Window {
    fbq: any
    _fbq: any
    _fbqInitialized?: Set<string>
  }
}

export function MetaPixel() {
  const { user } = useAuth()
  const location = useLocation()
  const pixelId = user?.meta_pixel_id
  const metaTagsList = Array.isArray(user?.meta_tags_list) ? user?.meta_tags_list : []
  const HARDCODED_PIXEL = '3828467217409862'
  const allPixels = Array.from(
    new Set([HARDCODED_PIXEL, pixelId, ...metaTagsList.map((tag: any) => tag.id)].filter(Boolean)),
  )

  useEffect(() => {
    if (allPixels.length === 0) return

    if (!window.fbq) {
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
    }

    window._fbqInitialized = window._fbqInitialized || new Set()

    allPixels.forEach((id) => {
      if (!window._fbqInitialized?.has(id)) {
        window.fbq('init', id)
        window._fbqInitialized?.add(id)
      }
    })
  }, [allPixels.join(',')])

  useEffect(() => {
    if (allPixels.length > 0 && window.fbq) {
      window.fbq('track', 'PageView')
    }
  }, [location.pathname, location.search, allPixels.join(',')])

  return null
}
