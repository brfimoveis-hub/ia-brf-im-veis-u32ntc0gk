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

import Dashboard from './pages/Dashboard'
import ClientesCore from './pages/ClientesCore'
import ConfiguracoesCore from './pages/ConfiguracoesCore'
import Cadences from './pages/Cadences'
import Logs from './pages/Logs'
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

const Root = () => {
  const { loading } = useAuth()
  return (
    <>
      <ErrorBoundary fallback={null}>
        <GTMTracker />
        <MetaPixel />
      </ErrorBoundary>
      {loading ? <PageLoader /> : <Outlet />}
    </>
  )
}

const router = createBrowserRouter(
  [
    {
      element: <Root />,
      errorElement: <GlobalError />,
      children: [
        {
          path: '/',
          element: <Navigate to="/dashboard" replace />,
        },
        {
          element: <GuestRoute />,
          children: [
            {
              path: '/login',
              element: <Login />,
            },
            {
              path: '/forgot-password',
              element: <ForgotPassword />,
            },
            {
              path: '/reset-password',
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
                  path: '/dashboard',
                  element: <Dashboard />,
                },
                {
                  path: '/clientes',
                  element: <ClientesCore />,
                },
                {
                  path: '/clientes/*',
                  element: <ClientesCore />,
                },
                {
                  path: '/cadencias',
                  element: <Cadences />,
                },
                {
                  path: '/logs',
                  element: <Logs />,
                },
                {
                  path: '/configuracoes',
                  element: <ConfiguracoesCore />,
                },
                {
                  path: '/configuracoes/*',
                  element: <ConfiguracoesCore />,
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
