import { Suspense, lazy, useState, useEffect } from 'react'
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { Loader2 } from 'lucide-react'
import { GlobalError } from '@/components/GlobalError'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'

import Cadences from './pages/Cadences'
import EmailMarketing from './pages/EmailMarketing'
import EmailCampaignDetail from './pages/EmailCampaignDetail'
import SettingsRemarketing from './pages/SettingsRemarketing'
import SettingsConnections from './pages/SettingsConnections'
import SettingsAI from './pages/SettingsAI'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import InstagramCallback from './pages/InstagramCallback'

const PageLoader = () => (
  <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

const ProtectedRoute = () => {
  const { user, loading, sessionExpired } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location, sessionExpired }} replace />
  return <Outlet />
}

const GuestRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageLoader />
  if (user) {
    const from = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }
  return <Outlet />
}

const RouteTracker = () => {
  const location = useLocation()
  const { loading, user } = useAuth()

  useEffect(() => {
    // Zero localStorage writes during auth loading or before user is ready
    if (loading || !user) return

    const path = location.pathname
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

    // Debounce de 2 segundos antes de gravar no localStorage
    const timeoutId = setTimeout(() => {
      idleId = scheduleTask(() => {
        if (isCancelled) return

        let component = 'Unknown'
        const lowerPath = path.toLowerCase()

        if (
          lowerPath === '/settings/connections' ||
          lowerPath.startsWith('/settings/connections/')
        ) {
          component = 'SettingsConnections'
        } else if (
          lowerPath === '/settings/remarketing' ||
          lowerPath.startsWith('/settings/remarketing/')
        ) {
          component = 'SettingsRemarketing'
        } else if (lowerPath === '/settings/ai' || lowerPath.startsWith('/settings/ai/')) {
          component = 'SettingsAI'
        } else if (lowerPath.startsWith('/dashboard')) {
          component = 'Dashboard'
        } else if (lowerPath.startsWith('/customers')) {
          component = 'Customers'
        } else if (lowerPath.startsWith('/customer-list')) {
          component = 'Customers'
        } else if (lowerPath.startsWith('/cadences')) {
          component = 'Cadences'
        } else if (lowerPath.startsWith('/email-marketing/') && lowerPath !== '/email-marketing') {
          component = 'EmailCampaignDetail'
        } else if (lowerPath.startsWith('/email-marketing')) {
          component = 'EmailMarketing'
        } else if (lowerPath === '/settings') {
          component = 'Settings'
        } else if (lowerPath === '/login') {
          component = 'Login'
        } else if (lowerPath === '/forgot-password') {
          component = 'ForgotPassword'
        } else if (lowerPath === '/reset-password') {
          component = 'ResetPassword'
        } else if (lowerPath === '/') {
          component = 'Root'
        }

        const routeData = { path, component }

        try {
          if (component !== 'Root') {
            localStorage.setItem('currentRoute', JSON.stringify(routeData))
          }

          const existing = localStorage.getItem('route-store')
          const newState = { currentRoute: routeData }
          if (existing) {
            const parsed = JSON.parse(existing)
            localStorage.setItem(
              'route-store',
              JSON.stringify({
                ...parsed,
                state: { ...parsed.state, ...newState },
              }),
            )
          } else {
            localStorage.setItem('route-store', JSON.stringify({ state: newState }))
          }
        } catch {
          // Ignora erros de storage (ex: modo anônimo ou quota)
        }
      })
    }, 2000)

    return () => {
      isCancelled = true
      clearTimeout(timeoutId)
      if (idleId) cancelScheduledTask(idleId)
    }
  }, [location.pathname, loading, user])

  return null
}

const Root = () => {
  const { loading } = useAuth()

  // Durante loading do Auth: renderizar APENAS o PageLoader — NADA de trackers, NADA de scripts externos
  if (loading) {
    return <PageLoader />
  }

  return (
    <>
      <RouteTracker />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <GlobalError />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        element: <GuestRoute />,
        children: [
          {
            path: 'login',
            element: <Login />,
          },
          {
            path: 'forgot-password',
            element: <ForgotPassword />,
          },
          {
            path: 'reset-password',
            element: <ResetPassword />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <Layout />,
            errorElement: <GlobalError />,
            children: [
              {
                path: 'dashboard',
                element: (
                  <ErrorBoundary>
                    <Dashboard />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'customers/*',
                element: (
                  <ErrorBoundary>
                    <Customers />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'customer-list/*',
                element: <Navigate to="/customers" replace />,
              },
              {
                path: 'cadences',
                element: (
                  <ErrorBoundary>
                    <Cadences />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'email-marketing',
                element: (
                  <ErrorBoundary>
                    <EmailMarketing />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'email-marketing/:campaignId',
                element: (
                  <ErrorBoundary>
                    <EmailCampaignDetail />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'settings/remarketing',
                element: (
                  <ErrorBoundary>
                    <SettingsRemarketing />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'settings/connections/*',
                element: (
                  <ErrorBoundary>
                    <SettingsConnections />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'settings/ai',
                element: (
                  <ErrorBoundary>
                    <SettingsAI />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'settings',
                element: <Navigate to="/settings/ai" replace />,
              },
            ],
          },
          {
            path: 'settings/connections/instagram/callback',
            element: (
              <ErrorBoundary>
                <InstagramCallback />
              </ErrorBoundary>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
])

const App = () => {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister()
        }
      })
    }
    localStorage.removeItem('vite-plugin-react-router-cache')
    sessionStorage.removeItem('vite-plugin-react-router-cache')
  }, [])

  return (
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RouterProvider router={router} />
      </TooltipProvider>
    </AuthProvider>
  )
}

export default App
