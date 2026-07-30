import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  message?: string
  onRetry: () => void
  retrying?: boolean
}

export function TableErrorState({
  message = 'Não foi possível carregar a lista de clientes.',
  onRetry,
  retrying = false,
}: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive/70" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{message}</p>
        <p className="text-xs text-muted-foreground">Verifique sua conexão e tente novamente.</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} disabled={retrying}>
        <RefreshCw className={retrying ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4'} />
        Tentar novamente
      </Button>
    </div>
  )
}
