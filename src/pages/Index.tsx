import { useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

export default function Index() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading) {
      // Ensure we only redirect if we are exactly on the index page
      if (window.location.pathname === '/' || window.location.pathname === '/index') {
        if (user) {
          navigate('/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      }
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return null
}
