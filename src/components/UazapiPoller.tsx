import { useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'

export function UazapiPoller() {
  const { user, isAuthenticated } = useAuth()

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const checkStatus = async () => {
      try {
        await pb.send('/backend/v1/uazapi/status', { method: 'GET' })
      } catch (err) {
        // Ignore background polling errors to prevent console spam
      }
    }

    // Initial check
    checkStatus()

    // Poll every 10 seconds to keep connection status updated in real-time
    const interval = setInterval(checkStatus, 10000)

    return () => clearInterval(interval)
  }, [isAuthenticated, user?.id])

  return null
}
