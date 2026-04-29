import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

declare global {
  interface Window {
    dataLayer: any[]
  }
}

export function GTMTracker() {
  const location = useLocation()

  // Initialize Cross-Domain Config
  useEffect(() => {
    try {
      window.dataLayer = window.dataLayer || []
      window.dataLayer.push({
        event: 'gtm_spa_init',
        linker_domains: ['ia-uazapi-6d79e.goskip.app', 'ia-uazapi-6d79e--preview.goskip.app'],
      })
    } catch (error) {
      console.error('GTM Init Error:', error)
    }
  }, [])

  // Track Page Views on route change
  useEffect(() => {
    try {
      window.dataLayer = window.dataLayer || []
      // Use setTimeout to allow React to update document.title if necessary
      const timeoutId = setTimeout(() => {
        window.dataLayer.push({
          event: 'virtual_pageview',
          page_path: location.pathname + location.search,
          page_title: document.title,
          page_location: window.location.href,
        })
      }, 100)

      return () => clearTimeout(timeoutId)
    } catch (error) {
      console.error('GTM Tracking Error:', error)
    }
  }, [location.pathname, location.search])

  return null
}
