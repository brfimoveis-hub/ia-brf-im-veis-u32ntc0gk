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
  const { user, loading } = useAuth()

  useEffect(() => {
    // Regra de ouro: NUNCA carregar antes de auth estar concluído ou se não houver usuário
    if (loading || !user) return

    const pixelId = user?.meta_pixel_id || '1093869151209421'
    if (!pixelId) return

    let isCancelled = false
    let timeoutId: any = null
    let idleId: any = null

    const scheduleTask = (cb: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        return (window as any).requestIdleCallback(cb, { timeout: 3000 })
      }
      return setTimeout(cb, 50)
    }

    const cancelScheduledTask = (id: any) => {
      if (
        typeof window !== 'undefined' &&
        'cancelIdleCallback' in window &&
        typeof id === 'number'
      ) {
        try {
          ;(window as any).cancelIdleCallback(id)
        } catch {
          clearTimeout(id)
        }
      } else {
        clearTimeout(id)
      }
    }

    const initPixel = () => {
      if (isCancelled) return
      try {
        if (!window.fbq) {
          const script = document.createElement('script')
          script.async = true
          script.defer = true
          script.src = 'https://connect.facebook.net/en_US/fbevents.js'
          script.onerror = () => {
            console.warn('[MetaPixel] Script external load suppressed/failed safely.')
          }
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

        if (window.fbq) {
          window.fbq('track', 'PageView')
        }
      } catch (err) {
        console.warn('[MetaPixel] Safe catch during init:', err)
      }
    }

    // Delay generoso de 5s para nunca competir com o carregamento e renderização inicial
    timeoutId = setTimeout(() => {
      idleId = scheduleTask(initPixel)
    }, 5000)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      if (idleId) cancelScheduledTask(idleId)
    }
  }, [pathname, user, loading])

  return null
}
