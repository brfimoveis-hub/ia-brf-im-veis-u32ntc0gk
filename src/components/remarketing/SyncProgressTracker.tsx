import { Progress } from '@/components/ui/progress'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface SyncProgressTrackerProps {
  isSyncing: boolean
  progress: number
  syncedCount: number
  failedCount: number
  totalSelected: number
  status: 'idle' | 'syncing' | 'success' | 'error'
}

export function SyncProgressTracker({
  isSyncing,
  progress,
  syncedCount,
  failedCount,
  totalSelected,
  status,
}: SyncProgressTrackerProps) {
  if (status === 'idle' && !isSyncing) return null

  const isSuccess = status === 'success'
  const isError = status === 'error'

  return (
    <div className="space-y-3 p-4 border rounded-lg bg-card animate-fade-in">
      <div className="flex items-center gap-2">
        {isSyncing && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        {isSuccess && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        {isError && <XCircle className="h-4 w-4 text-destructive" />}
        <span className="text-sm font-medium">
          {isSyncing ? 'Enviando para Meta...' : isSuccess ? 'Concluído!' : 'Falha no envio'}
        </span>
        <span className="text-sm text-muted-foreground ml-auto">{progress}%</span>
      </div>
      <Progress value={progress} className="h-2" />
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded bg-muted">
          <div className="font-bold text-base">{totalSelected}</div>
          <div className="text-muted-foreground">Total</div>
        </div>
        <div className="p-2 rounded bg-muted">
          <div className="font-bold text-base text-green-600">{syncedCount}</div>
          <div className="text-muted-foreground">Sucesso</div>
        </div>
        <div className="p-2 rounded bg-muted">
          <div className="font-bold text-base text-red-600">{failedCount}</div>
          <div className="text-muted-foreground">Falhas</div>
        </div>
      </div>
    </div>
  )
}
