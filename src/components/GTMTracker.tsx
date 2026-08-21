import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    dataLayer: any[]
  }
}

import { useAuth } from '@/hooks/use-auth'

export function GTMTracker() {
  const location = useLocation()
  const { user, loading } = useAuth()

  // Initialize Cross-Domain Config (only after auth and with idle/delay)
  useEffect(() => {
    if (loading || !user) return

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

    timeoutId = setTimeout(() => {
      idleId = scheduleTask(() => {
        if (isCancelled) return
        try {
          window.dataLayer = window.dataLayer || []
          window.dataLayer.push({
            event: 'gtm_spa_init',
            linker_domains: ['ia-uazapi-6d79e.goskip.app', 'ia-uazapi-6d79e--preview.goskip.app'],
            linker: {
              domains: ['ia-uazapi-6d79e.goskip.app', 'ia-uazapi-6d79e--preview.goskip.app'],
            },
          })
        } catch (error) {
          console.warn('GTM Init Safe Warning:', error)
        }
      })
    }, 5000)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      if (idleId) cancelScheduledTask(idleId)
    }
  }, [user, loading])

  // Track Page Views on route change (with debounce and idle execution)
  useEffect(() => {
    if (loading || !user) return

    let isCancelled = false
    let idleId: any = null

    const scheduleTask = (cb: () => void) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        return (window as any).requestIdleCallback(cb, { timeout: 2000 })
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

    const timeoutId = setTimeout(() => {
      idleId = scheduleTask(() => {
        if (isCancelled) return
        try {
          window.dataLayer = window.dataLayer || []
          window.dataLayer.push({
            event: 'virtual_page_view',
            path: location.pathname,
            page_path: location.pathname + location.search,
            page_title: typeof document !== 'undefined' ? document.title : '',
            page_location: typeof window !== 'undefined' ? window.location.href : '',
          })
        } catch (error) {
          console.warn('GTM Tracking Safe Warning:', error)
        }
      })
    }, 2000)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      if (idleId) cancelScheduledTask(idleId)
    }
  }, [location.pathname, location.search, user, loading])

  return null
}
