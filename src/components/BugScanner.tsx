import { useState, useEffect } from 'react'
import { Bug, AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { subscribeToErrors, setupGlobalErrorHandlers, type ErrorReport } from '@/lib/error-reporter'

export function BugScanner({ className }: { className?: string }) {
  const [errors, setErrors] = useState<ErrorReport[]>([])
  const [open, setOpen] = useState(false)

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
                v0.0.1322
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

        {/* Card de versão e limpeza de cache para confirmação do usuário */}
        <div className="mt-3 p-3 rounded-lg border bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Build atual em execução:
            </span>
            <span className="font-bold font-mono text-emerald-700 dark:text-emerald-400">
              v0.0.1322
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
              url.searchParams.set('_v', '1322')
              window.location.href = url.toString()
            }}
            className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-xs"
          >
            Limpar Cache & Recarregar v0.0.1322
          </Button>
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
