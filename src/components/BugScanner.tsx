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
              <Bug className="h-5 w-5" />
              Bug Scanner
            </span>
            {errors.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <Trash2 className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
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
