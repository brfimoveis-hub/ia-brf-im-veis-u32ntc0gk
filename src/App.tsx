import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Index from './pages/Index'
import CRM from './pages/CRM'
import Customers from './pages/Customers'
import Conversations from './pages/Conversations'
import Settings from './pages/Settings'
import KnowledgeBase from './pages/KnowledgeBase'
import NotFound from './pages/NotFound'
import Login from './pages/Login'
import Layout from './components/Layout'
import { AuthProvider, useAuth } from '@/hooks/use-auth'
import { MetaPixel } from '@/components/MetaPixel'

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
        { path: '/login', element: <Login /> },
        {
          element: <ProtectedRoute />,
          children: [
            {
              element: <Layout />,
              children: [
                { path: '/', element: <Index /> },
                { path: '/crm', element: <CRM /> },
                { path: '/clientes', element: <Customers /> },
                { path: '/conversas', element: <Conversations /> },
                { path: '/conhecimento', element: <KnowledgeBase /> },
                { path: '/configuracoes', element: <Settings /> },
              ],
            },
          ],
        },
        { path: '*', element: <NotFound /> },
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
