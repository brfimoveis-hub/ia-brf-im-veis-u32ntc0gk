import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
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

// Break circular dependencies completely by using lazy-loaded routes
const Index = lazy(() => import('./pages/Index'))
const Customers = lazy(() => import('./pages/Customers'))
const Settings = lazy(() => import('./pages/Settings'))
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))
const Cadences = lazy(() => import('./pages/Cadences'))
const Logs = lazy(() => import('./pages/Logs'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/Login'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))

const PageLoader = () => (
  <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
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
          path: '/login',
          element: (
            <Suspense fallback={<PageLoader />}>
              <Login />
            </Suspense>
          ),
        },
        {
          path: '/forgot-password',
          element: (
            <Suspense fallback={<PageLoader />}>
              <ForgotPassword />
            </Suspense>
          ),
        },
        {
          path: '/reset-password',
          element: (
            <Suspense fallback={<PageLoader />}>
              <ResetPassword />
            </Suspense>
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
                  index: true,
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Index />
                    </Suspense>
                  ),
                },
                {
                  path: '/clientes',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Customers />
                    </Suspense>
                  ),
                },
                {
                  path: '/conhecimento',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <KnowledgeBase />
                    </Suspense>
                  ),
                },
                {
                  path: '/cadencias',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Cadences />
                    </Suspense>
                  ),
                },
                {
                  path: '/logs',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Logs />
                    </Suspense>
                  ),
                },
                {
                  path: '/configuracoes',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Settings />
                    </Suspense>
                  ),
                },
              ],
            },
          ],
        },
        {
          path: '*',
          element: (
            <Suspense fallback={<PageLoader />}>
              <NotFound />
            </Suspense>
          ),
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

const App = () => (
  <AuthProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <RouterProvider router={router} future={{ v7_startTransition: true }} />
    </TooltipProvider>
  </AuthProvider>
)

export default App
