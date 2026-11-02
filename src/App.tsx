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
import { APP_VERSION } from '@/lib/version'
import { resolveComponentFromPath } from '@/components/BugScanner'
import { ErrorBoundary } from '@/components/ErrorBoundary'

import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Atendimentos from './pages/Atendimentos'
import Estatisticas from './pages/Estatisticas'
import Anuncios from './pages/Anuncios'
import Launches from './pages/Launches'
import LaunchLanding from './pages/LaunchLanding'
import FaxinaAtivosMeta from './pages/FaxinaAtivosMeta'
import ScheduledPosts from './pages/ScheduledPosts'

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
import PrivacyPolicy from './pages/PrivacyPolicy'
import VistageLandingPage from './pages/VistageLandingPage'

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
    const from = location.state?.from?.pathname || '/atendimentos'
    return <Navigate to={from} replace />
  }
  return <Outlet />
}

const RouteTracker = () => {
  const location = useLocation()

  useEffect(() => {
    // Gravação IMEDIATA e SÍNCRONA da rota atual para BugScanner e diagnósticos automatizados
    // Funciona mesmo antes de autenticação ou em rotas públicas/anônimas
    const livePath =
      (typeof window !== 'undefined' && window.location.pathname) || location.pathname || '/'
    const resolved = resolveComponentFromPath(livePath)
    const component = resolved === 'Index' ? 'Atendimentos' : resolved
    const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
    const isProduction = hostname.includes('brfiacrminteligente.goskip.app')
    const environment = isProduction ? 'production' : 'preview'

    const routeData = {
      path: livePath,
      component,
      environment,
      version: APP_VERSION,
    }

    try {
      // Grava sempre com environment e version garantidos e NUNCA Index
      localStorage.setItem('currentRoute', JSON.stringify(routeData))
      localStorage.setItem('route-store', JSON.stringify({ state: { currentRoute: routeData } }))
    } catch {
      // Ignora erros de storage (ex: quota ou navegação privada restrita)
    }

    // Espelha também no window global para detecção viva imediata
    if (typeof window !== 'undefined') {
      ;(window as any).__currentRoute = routeData
    }
  }, [location.pathname])

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
        element: <ProtectedRoute />,
        children: [
          {
            index: true,
            element: <Navigate to="/atendimentos" replace />,
          },
        ],
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
        path: 'site',
        element: <VistageLandingPage />,
      },
      {
        path: 'vistage',
        element: <VistageLandingPage />,
      },
      {
        path: 'privacidade',
        element: <PrivacyPolicy />,
      },
      {
        path: 'l/vistage-residence',
        element: <VistageLandingPage />,
      },
      {
        path: 'l/:slug',
        element: (
          <ErrorBoundary>
            <LaunchLanding />
          </ErrorBoundary>
        ),
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
                path: 'atendimentos',
                element: (
                  <ErrorBoundary>
                    <Atendimentos />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'bia',
                element: <Navigate to="/atendimentos" replace />,
              },
              {
                path: 'estatisticas',
                element: (
                  <ErrorBoundary>
                    <Estatisticas />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'anuncios',
                element: (
                  <ErrorBoundary>
                    <Anuncios />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'faxina-meta',
                element: (
                  <ErrorBoundary>
                    <FaxinaAtivosMeta />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'launches',
                element: (
                  <ErrorBoundary>
                    <Launches />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'posts',
                element: (
                  <ErrorBoundary>
                    <ScheduledPosts />
                  </ErrorBoundary>
                ),
              },
              {
                path: 'agenda',
                element: <Navigate to="/posts" replace />,
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
                path: 'clientes',
                element: <Navigate to="/customers" replace />,
              },
              {
                path: 'clientes/*',
                element: <Navigate to="/customers" replace />,
              },
              {
                path: 'customer-list/*',
                element: <Navigate to="/customers" replace />,
              },
              {
                path: 'cadences',
                element: <Navigate to="/customers" replace />,
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
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          caches.delete(key)
        }
      })
    }
    localStorage.removeItem('vite-plugin-react-router-cache')
    sessionStorage.removeItem('vite-plugin-react-router-cache')

    // Saneamento preventivo e purga de versão
    try {
      const storedVersion = localStorage.getItem('app_version')
      if (storedVersion !== APP_VERSION) {
        localStorage.removeItem('currentRoute')
        localStorage.removeItem('route-store')
        localStorage.setItem('app_version', APP_VERSION)
      }
      const oldCurrent = localStorage.getItem('currentRoute')
      if (oldCurrent) {
        const parsed = JSON.parse(oldCurrent)
        if (
          parsed.component === 'Index' ||
          !parsed.environment ||
          !parsed.version ||
          parsed.version !== APP_VERSION
        ) {
          localStorage.removeItem('currentRoute')
        }
      }
      const oldStore = localStorage.getItem('route-store')
      if (oldStore) {
        const parsedStore = JSON.parse(oldStore)
        if (
          parsedStore?.state?.currentRoute?.component === 'Index' ||
          !parsedStore?.state?.currentRoute?.environment ||
          !parsedStore?.state?.currentRoute?.version ||
          parsedStore?.state?.currentRoute?.version !== APP_VERSION
        ) {
          localStorage.removeItem('route-store')
        }
      }
    } catch {
      // Ignora erros de parsing
    }
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
