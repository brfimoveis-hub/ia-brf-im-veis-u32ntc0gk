import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
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
  BarChart3,
  Megaphone,
  Building2,
  Trash2,
} from 'lucide-react'
import { BiaAvatar } from '@/components/common/BiaAvatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ConnectionAlertBanner } from '@/components/ConnectionAlertBanner'
import { BugScanner } from '@/components/BugScanner'
import { GTMTracker } from '@/components/GTMTracker'
import { MetaPixel } from '@/components/MetaPixel'
import { APP_VERSION } from '@/lib/version'

export default function Layout() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState<any>(user)
  const [sheetOpen, setSheetOpen] = useState(false)

  useEffect(() => {
    setCurrentUser(user)
  }, [user])

  // Fecha o menu móvel ao navegar
  useEffect(() => {
    setSheetOpen(false)
  }, [location.pathname])

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      setCurrentUser(e.record)
    }
  })

  const navItems = [
    { name: 'Cérebro do Sistema', path: '/dashboard', icon: Bot },
    { name: 'Atendimentos (IA)', path: '/atendimentos', icon: MessageSquare },
    { name: 'Lançamentos', path: '/launches', icon: Building2 },
    { name: 'Agenda de Posts', path: '/posts', icon: Megaphone },
    { name: 'Estatísticas', path: '/estatisticas', icon: BarChart3 },
    { name: 'Anúncios', path: '/anuncios', icon: Megaphone },
    { name: 'Clientes', path: '/customers', icon: Users },
    { name: 'Email Marketing', path: '/email-marketing', icon: Mail },
    { name: 'Remarketing', path: '/settings/remarketing', icon: Target },
    { name: 'Faxina de Ativos Meta', path: '/faxina-meta', icon: Trash2 },
    { name: 'Conexões', path: '/settings/connections', icon: Activity },
    { name: 'Configurações de IA', path: '/settings/ai', icon: Sparkles },
  ]

  const SidebarContent = () => (
    <div className="flex h-full flex-col overflow-hidden bg-slate-900 text-slate-100">
      {/* Topo da sidebar: avatar + título BRF IA CRM (fixo, não rola) */}
      <div className="flex h-16 flex-shrink-0 items-center px-5 text-lg font-semibold border-b border-slate-800 gap-2.5">
        <BiaAvatar size="sm" showStatusIndicator />
        <span className="truncate">BRF IA CRM</span>
      </div>

      {/* Área superior de links de navegação com rolagem própria independente: flex: 1 1 auto, min-height: 0, overflow-y: auto */}
      <div className="flex-1 min-h-0 overflow-y-auto py-4 sidebar-scrollbar">
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSheetOpen(false)}
                className={cn(
                  'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-slate-800 text-white font-semibold shadow-xs'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )}
              >
                <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Área inferior fixa: STATUS DAS INTEGRAÇÕES + usuário + ações (sempre visível na base, fora do scroll) */}
      <div className="flex-shrink-0 border-t border-slate-800 p-4 space-y-4 bg-slate-900">
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
                  currentUser?.meta_capi_status?.toLowerCase() === 'connected' ||
                  currentUser?.meta_capi_status?.toLowerCase() === 'ok'
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
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-800">
                {APP_VERSION} ·{' '}
                {typeof window !== 'undefined' &&
                window.location.hostname.includes('brfiacrminteligente.goskip.app')
                  ? 'prod'
                  : 'prev'}
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                {currentUser?.email}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <BugScanner className="text-slate-400 hover:text-white hover:bg-slate-800" />
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
    </div>
  )

  const isAtendimentos = location.pathname.startsWith('/atendimentos')
  const hasSelectedCustomerInUrl =
    isAtendimentos && new URLSearchParams(location.search).has('cliente')

  return (
    <div
      className={cn(
        'flex bg-slate-50 w-full min-h-[100dvh]',
        // No mobile com conversa aberta: fixa a viewport em tela cheia estilo WhatsApp
        // Em todas as outras situações (inclusive desktop), min-h-[100dvh] permite rolagem natural sem truncar altura
        hasSelectedCustomerInUrl && 'h-[100dvh] max-h-[100dvh] overflow-hidden',
      )}
    >
      {/* Desktop sidebar: 100dvh, flex column, overflow hidden, fixada à esquerda com rolagem independente de links */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 h-screen h-[100dvh] overflow-hidden z-30">
        <SidebarContent />
      </aside>

      <div
        className={cn(
          'flex flex-col flex-1 min-w-0 md:pl-64 w-full',
          hasSelectedCustomerInUrl ? 'h-full overflow-hidden' : 'min-h-[100dvh]',
        )}
      >
        {/* Mobile header: quando conversa está aberta em /atendimentos, o chat tem seu próprio header nativo estilo WhatsApp */}
        <div
          className={cn(
            'sticky top-0 z-40 flex h-16 flex-shrink-0 bg-white border-b shadow-sm md:hidden px-4 justify-between items-center',
            hasSelectedCustomerInUrl ? 'hidden' : 'flex',
          )}
        >
          <div className="font-semibold text-lg flex items-center gap-2">
            <span>BRF IA CRM</span>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-700">
              {APP_VERSION} ·{' '}
              {typeof window !== 'undefined' &&
              window.location.hostname.includes('brfiacrminteligente.goskip.app')
                ? 'prod'
                : 'prev'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <BugScanner />
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="h-9 w-9">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-72 max-w-[80vw] bg-slate-900 border-none shadow-2xl h-screen h-[100dvh] overflow-hidden flex flex-col"
              >
                <SidebarContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Connection Alert Banner (oculto no mobile quando conversa aberta para liberar viewport total estilo WhatsApp) */}
        <div className={cn(hasSelectedCustomerInUrl ? 'hidden md:block' : 'block')}>
          <ConnectionAlertBanner />
        </div>

        {/* Trackers lazy mount inside authenticated Layout with safe error boundary */}
        <ErrorBoundary fallback={null}>
          <GTMTracker />
          <MetaPixel />
        </ErrorBoundary>

        {/* Main content:
            - Garante rolagem natural e sem bloqueio em mobile e desktop.
            - No desktop split view de /atendimentos, o container ocupa min-h-[calc(100dvh-...)] com cada painel tendo scroll garantido.
            - Em /clientes, permite que a página e as listas rolem suavemente até o final.
        */}
        <main
          className={cn(
            'flex-1 min-w-0 flex flex-col',
            hasSelectedCustomerInUrl
              ? 'h-full overflow-hidden p-0'
              : isAtendimentos
                ? 'p-0 lg:p-6'
                : 'p-3 sm:p-4 md:p-8',
          )}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="flex-1 flex flex-col w-full">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  )
}
