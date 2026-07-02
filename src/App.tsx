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
import { MetaPixel } from '@/components/MetaPixel'
import { GTMTracker } from '@/components/GTMTracker'
import { Loader2 } from 'lucide-react'
import { GlobalError } from '@/components/GlobalError'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { UazapiPoller } from '@/components/UazapiPoller'

import Dashboard from './pages/Index'
import Customers from './pages/Customers'
import CustomerList from './pages/CustomerList'
import Cadences from './pages/Cadences'
import SettingsRemarketing from './pages/SettingsRemarketing'
import SettingsConnections from './pages/SettingsConnections'
import SettingsAI from './pages/SettingsAI'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

const PageLoader = () => (
  <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />
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

  useEffect(() => {
    const path = location.pathname
    let component = 'Unknown'

    const lowerPath = path.toLowerCase()

    if (lowerPath === '/settings/connections') {
      component = 'SettingsConnections'
    } else if (lowerPath === '/settings/remarketing') {
      component = 'SettingsRemarketing'
    } else if (lowerPath === '/settings/ai') {
      component = 'SettingsAI'
    } else if (lowerPath.startsWith('/dashboard')) {
      component = 'Dashboard'
    } else if (lowerPath.startsWith('/customers')) {
      component = 'Customers'
    } else if (lowerPath.startsWith('/customer-list')) {
      component = 'CustomerList'
    } else if (lowerPath.startsWith('/cadences')) {
      component = 'Cadences'
    } else if (lowerPath === '/') {
      component = 'Root'
    }

    const routeData = { path, component }

    if (component !== 'Root') {
      localStorage.setItem('currentRoute', JSON.stringify(routeData))
    }

    try {
      const existing = localStorage.getItem('route-store')
      if (existing) {
        const parsed = JSON.parse(existing)
        localStorage.setItem(
          'route-store',
          JSON.stringify({
            ...parsed,
            state: { ...parsed.state, currentRoute: routeData },
          }),
        )
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [location])

  return null
}

const Root = () => {
  const { loading, user } = useAuth()
  return (
    <div className="contents">
      <RouteTracker />
      <ErrorBoundary fallback={null}>
        <GTMTracker />
        <MetaPixel />
        {user && <UazapiPoller />}
      </ErrorBoundary>
      {loading ? <PageLoader /> : <Outlet />}
    </div>
  )
}

const router = createBrowserRouter(
  [
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
                  element: <Dashboard />,
                },
                {
                  path: 'customers/*',
                  element: <Customers />,
                },
                {
                  path: 'customer-list/*',
                  element: <CustomerList />,
                },
                {
                  path: 'cadences',
                  element: <Cadences />,
                },
                {
                  path: 'settings/remarketing',
                  element: <SettingsRemarketing />,
                },
                {
                  path: 'settings/connections/*',
                  element: <SettingsConnections />,
                },
                {
                  path: 'settings/ai',
                  element: <SettingsAI />,
                },
              ],
            },
          ],
        },
        {
          path: '*',
          element: <NotFound />,
        },
      ],
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,
      v7_normalizeFormMethod: true,
      v7_partialHydration: true,
      v7_skipActionErrorRevalidation: true,
    },
  },
)

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
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </TooltipProvider>
    </AuthProvider>
  )
}

export default App
