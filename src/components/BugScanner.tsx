import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Bug, AlertCircle, Trash2, Code2 } from 'lucide-react'
import { ReguaPauseControl } from '@/components/customers/ReguaPauseControl'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { subscribeToErrors, setupGlobalErrorHandlers, type ErrorReport } from '@/lib/error-reporter'
import { APP_VERSION } from '@/lib/version'

export function resolveComponentFromPath(pathname: string): string {
  const raw = (pathname || '').split('?')[0].split('#')[0]
  const cleanPath = raw.toLowerCase().trim()
  if (cleanPath === '' || cleanPath === '/') return 'Atendimentos'
  if (cleanPath === '/atendimentos' || cleanPath.startsWith('/atendimentos/')) return 'Atendimentos'
  if (cleanPath === '/dashboard' || cleanPath.startsWith('/dashboard/')) return 'Dashboard'
  if (
    cleanPath === '/customers' ||
    cleanPath.startsWith('/customers/') ||
    cleanPath === '/customer-list' ||
    cleanPath.startsWith('/customer-list/') ||
    cleanPath === '/cadences' ||
    cleanPath.startsWith('/cadences/')
  )
    return 'Customers'
  if (cleanPath === '/launches' || cleanPath.startsWith('/launches/')) return 'Launches'
  if (cleanPath.startsWith('/l/')) return 'LaunchLanding'
  if (
    cleanPath === '/posts' ||
    cleanPath.startsWith('/posts/') ||
    cleanPath === '/agenda' ||
    cleanPath.startsWith('/agenda/')
  )
    return 'ScheduledPosts'
  if (cleanPath === '/estatisticas' || cleanPath.startsWith('/estatisticas/')) return 'Estatisticas'
  if (cleanPath === '/anuncios' || cleanPath.startsWith('/anuncios/')) return 'Anuncios'
  if (cleanPath === '/faxina-meta' || cleanPath.startsWith('/faxina-meta/'))
    return 'FaxinaAtivosMeta'
  if (cleanPath.startsWith('/email-marketing/') && cleanPath !== '/email-marketing')
    return 'EmailCampaignDetail'
  if (cleanPath === '/email-marketing' || cleanPath.startsWith('/email-marketing/'))
    return 'EmailMarketing'
  if (cleanPath === '/settings/remarketing' || cleanPath.startsWith('/settings/remarketing/'))
    return 'SettingsRemarketing'
  if (cleanPath.startsWith('/settings/connections')) return 'SettingsConnections'
  if (
    cleanPath === '/settings/ai' ||
    cleanPath.startsWith('/settings/ai/') ||
    cleanPath === '/settings'
  )
    return 'SettingsAI'
  if (cleanPath === '/login') return 'Login'
  if (cleanPath === '/forgot-password') return 'ForgotPassword'
  if (cleanPath === '/reset-password') return 'ResetPassword'
  if (cleanPath === '/privacidade') return 'PrivacyPolicy'
  if (cleanPath === '/site' || cleanPath === '/vistage') return 'VistageLandingPage'
  return 'NotFound'
}

export function BugScanner({ className }: { className?: string }) {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setupGlobalErrorHandlers()
    const unsubscribe = subscribeToErrors((report) => {
      setErrors((prev) => [report, ...prev].slice(0, 50))
    })
    return () => {
      unsubscribe()
    }
  }, [])

  const handleClear = () => {
    setErrors([])
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label="Bug Scanner"
        >
          <Bug className="h-5 w-5" />
          {errors.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
              {errors.length > 99 ? '99+' : errors.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-emerald-600" />
              <span>Diagnóstico & Versão</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-700">
                {APP_VERSION}
              </span>
              {errors.length > 0 && (
                <Button variant="ghost" size="sm" onClick={handleClear}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        {/* Debug: Rota atual e componente renderizado com detecção de ambiente preview x produção */}
        {(() => {
          const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
          const isProductionHost = hostname.includes('brfiacrminteligente.goskip.app')
          const environmentLabel = isProductionHost ? 'production' : 'preview'
          const currentResolved = resolveComponentFromPath(location.pathname)

          // Objeto canônico de debug garantindo ambiente e versão dentro de currentRoute e na raiz
          const debugPayload = {
            currentRoute: {
              path: location.pathname,
              component: currentResolved,
              environment: environmentLabel,
              version: APP_VERSION,
            },
            environment: environmentLabel,
            version: APP_VERSION,
            host: hostname,
          }

          return (
            <div className="mt-3 p-3 rounded-lg border bg-slate-900 text-slate-100 dark:bg-slate-950 border-slate-700 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                  <Code2 className="h-3.5 w-3.5" /> currentRoute
                </span>
                <span className="text-[10px] font-bold text-emerald-400">{APP_VERSION}</span>
              </div>

              {/* Banner de Ambiente: Alerta explícito quando em Produção vs Preview */}
              <div
                className={cn(
                  'p-2 rounded text-[11px] font-sans border flex items-center justify-between gap-2',
                  isProductionHost
                    ? 'bg-amber-950/60 text-amber-200 border-amber-700/60'
                    : 'bg-emerald-950/60 text-emerald-200 border-emerald-700/60',
                )}
              >
                <div className="flex flex-col">
                  <span className="font-bold">
                    {isProductionHost
                      ? '🌐 Ambiente: PRODUÇÃO'
                      : '⚡ Ambiente: PREVIEW (Atualizado)'}
                  </span>
                  <span className="text-[10px] opacity-90">
                    {isProductionHost
                      ? 'Produção só atualiza após Publicar. Se você testar aqui verá versão antiga até publicação.'
                      : 'Preview reflete o código mais recente em tempo real.'}
                  </span>
                </div>
              </div>

              <pre className="text-[11px] text-emerald-300 bg-slate-950/80 p-2 rounded overflow-x-auto whitespace-pre">
                {JSON.stringify(debugPayload, null, 2)}
              </pre>
            </div>
          )
        })()}

        {/* Freio de Emergência: Parar/Retomar Envios da Régua Automática */}
        <div className="mt-3 p-3 rounded-lg border bg-amber-500/10 border-amber-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <span>⏸️ Freio de Envio da Bia</span>
            </span>
            <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
              Controle Geral
            </span>
          </div>
          <p className="text-[11px] text-amber-800 dark:text-amber-200/90 leading-tight">
            Interrompa ou retome o disparo de novas mensagens automáticas (régua/remarketing) com um
            clique. Respostas a clientes continuam normais.
          </p>
          <ReguaPauseControl />
        </div>

        {/* Card de versão e limpeza de cache para confirmação do usuário */}
        <div className="mt-3 p-3 rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Build atual em execução:
            </span>
            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
              {APP_VERSION}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            Se seu celular estiver mostrando versão antiga em cache, toque abaixo para forçar
            recarga limpa.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              if ('caches' in window) {
                caches.keys().then((keys) => {
                  for (const k of keys) caches.delete(k)
                })
              }
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then((regs) => {
                  for (const r of regs) r.unregister()
                })
              }
              const url = new URL(window.location.href)
              url.searchParams.set('_v', '1341')
              window.location.href = url.toString()
            }}
            className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs"
          >
            Limpar Cache & Recarregar v0.0.1341
          </Button>{' '}
        </div>
        <div className="mt-4 space-y-2">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bug className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum erro capturado.</p>
              <p className="text-xs text-muted-foreground mt-1">
                O sistema está funcionando normalmente.
              </p>
            </div>
          ) : (
            errors.map((err, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-red-600">{err.type}</p>
                    <p className="text-sm mt-1 break-words">{err.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
