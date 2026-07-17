import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  Menu,
  Activity,
  MessageSquare,
  Bot,
  RefreshCw,
  Sparkles,
  Target,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState<any>(user)

  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record)
    }
  })

  const navItems = [
    { name: 'Cérebro do Sistema', path: '/dashboard', icon: Bot },
    { name: 'Pipeline', path: '/customers', icon: LayoutDashboard },
    { name: 'Lista de Clientes', path: '/customer-list', icon: Users },
    { name: 'Cadências', path: '/cadences', icon: Settings },
    { name: 'Email Marketing', path: '/email-marketing', icon: Mail },
    { name: 'Remarketing', path: '/settings/remarketing', icon: Target },
    { name: 'Conexões', path: '/settings/connections', icon: MessageSquare },
    { name: 'Configurações de IA', path: '/settings/ai', icon: Sparkles },
  ]

  const SidebarContent = () => (
    <div className="flex h-full flex-col bg-slate-900 text-slate-100">
      <div className="flex h-16 items-center px-6 text-lg font-semibold border-b border-slate-800">
        BRF Imóveis CRM
      </div>
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.name}
                to={item.path}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      <div className="border-t border-slate-800 p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Status das Integrações
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <Activity className="h-4 w-4" /> Meta CAPI
            </span>
            <span
              className={cn(
                'flex h-2.5 w-2.5 rounded-full',
                currentUser?.meta_capi_status?.toLowerCase() === 'active' ||
                  currentUser?.meta_capi_status?.toLowerCase() === 'connected'
                  ? 'bg-green-500'
                  : currentUser?.meta_capi_status?.toLowerCase() === 'error'
                    ? 'bg-red-500'
                    : 'bg-yellow-500',
              )}
              title={currentUser?.meta_capi_status || 'Unknown'}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex flex-col">
            <span className="text-sm font-medium truncate max-w-[150px]">
              {currentUser?.name || currentUser?.email}
            </span>
            <span className="text-xs text-slate-400 truncate max-w-[150px]">
              {currentUser?.email}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <SidebarContent />
      </div>

      <div className="flex flex-col flex-1 md:pl-64">
        {/* Mobile header */}
        <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white border-b shadow-sm md:hidden px-4 justify-between items-center">
          <div className="font-semibold text-lg">BRF Imóveis CRM</div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-slate-900 border-none">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
