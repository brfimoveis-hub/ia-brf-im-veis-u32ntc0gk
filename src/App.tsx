import { Suspense, lazy } from 'react'
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { MetaPixel } from '@/components/MetaPixel'
import { Loader2 } from 'lucide-react'

// Break circular dependencies completely by using lazy-loaded routes
const Index = lazy(() => import('./pages/Index'))
const CRM = lazy(() => import('./pages/CRM'))
const Customers = lazy(() => import('./pages/Customers'))
const Conversations = lazy(() => import('./pages/Conversations'))
const Settings = lazy(() => import('./pages/Settings'))
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase'))
const Cadences = lazy(() => import('./pages/Cadences'))
const NotFound = lazy(() => import('./pages/NotFound'))
const Login = lazy(() => import('./pages/Login'))

const PageLoader = () => (
  <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
)

const ProtectedRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

const Root = () => (
  <>
    <MetaPixel />
    <Outlet />
  </>
)

const router = createBrowserRouter(
  [
    {
      element: <Root />,
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
          element: <ProtectedRoute />,
          children: [
            {
              element: <Layout />,
              children: [
                {
                  path: '/',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Index />
                    </Suspense>
                  ),
                },
                {
                  path: '/crm',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <CRM />
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
                  path: '/conversas',
                  element: (
                    <Suspense fallback={<PageLoader />}>
                      <Conversations />
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
