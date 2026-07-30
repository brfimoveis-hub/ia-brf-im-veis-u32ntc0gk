import { useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const NotFound = () => {
  const location = useLocation()

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname)
  }, [location.pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl text-gray-600">Oops! Página não encontrada</p>
        <Button asChild>
          <Link to="/dashboard">Voltar ao Dashboard</Link>
        </Button>
      </div>
    </div>
  )
}

export default NotFound
