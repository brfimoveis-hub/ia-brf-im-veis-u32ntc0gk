import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useAutoRetry } from '@/hooks/use-auto-retry'
import { useRemarketingSync } from '@/hooks/use-remarketing-sync'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Send, ArrowRight, AlertCircle, Loader2, StopCircle, RefreshCw } from 'lucide-react'
import { RemarketingStatusBanner } from '@/components/remarketing/RemarketingStatusBanner'
import { RemarketingCustomerTable } from '@/components/remarketing/RemarketingCustomerTable'
import { SyncProgressTracker } from '@/components/remarketing/SyncProgressTracker'
import { RemarketingLogsCard } from '@/components/remarketing/RemarketingLogsCard'
import { WhatsAppIdentityCard } from '@/components/remarketing/WhatsAppIdentityCard'

export default function SettingsRemarketing() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(user)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [loadingUser, setLoadingUser] = useState(true)
  const [errorUser, setErrorUser] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const sync = useRemarketingSync()

  useEffect(() => {
    if (!user?.id) {
      setLoadingUser(false)
      return
    }
    let cancelled = false
    setLoadingUser(true)
    setErrorUser(false)
    pb.collection('users')
      .getOne(user.id)
      .then((data) => {
        if (!cancelled) {
          setCurrentUser(data)
          setLoadingUser(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrorUser(true)
          setLoadingUser(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [user?.id, refreshKey])

  const { isRetrying } = useAutoRetry(
    errorUser,
    () => setRefreshKey((k) => k + 1),
    800,
    loadingUser,
  )

  useRealtime('users', (e) => {
    if (user?.id && e.record.id === user.id) setCurrentUser(e.record)
  })

  const hasCredentials =
    !!(currentUser?.meta_pixel_id?.trim() || currentUser?.meta_dataset_id?.trim()) &&
    !!currentUser?.meta_capi_token?.trim()

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectPage = useCallback((ids: string[], select: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (select ? next.add(id) : next.delete(id)))
      return next
    })
  }, [])

  const selectAllFiltered = useCallback((ids: string[]) => setSelectedIds(new Set(ids)), [])
  const clearSelection = useCallback(() => setSelectedIds(new Set()), [])

  const handleConfirmSend = async () => {
    setConfirmOpen(false)
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setFetching(true)
    try {
      const customers: any[] = []
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100)
        const filter = chunk.map((id) => `id = "${id}"`).join(' || ')
        customers.push(...(await pb.collection('customers').getFullList({ filter })))
      }
      setFetching(false)
      await sync.sync(customers, 100)
    } catch (err: any) {
      setFetching(false)
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar dados',
        description: err.message || 'Falha ao buscar clientes selecionados.',
      })
    }
  }

  if (loadingUser || (errorUser && isRetrying)) {
    return (
      <div className="container mx-auto py-8 max-w-6xl space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    )
  }

  if (errorUser) {
    return (
      <div className="container mx-auto py-8 max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Remarketing (Meta)</h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
            Selecione segmentos de clientes e envie para o Meta via Conversions API (CAPI).
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-lg font-medium mb-1">Alguns dados não podem ser carregados.</p>
          <p className="text-sm text-muted-foreground mb-4">Tente novamente.</p>
          <Button onClick={() => setRefreshKey((k) => k + 1)} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Remarketing (Meta)</h1>
        <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
          Selecione segmentos de clientes e envie para o Meta via Conversions API (CAPI).
        </p>
      </div>

      <RemarketingStatusBanner
        hasAccessToken={!!currentUser?.meta_whatsapp_access_token?.trim()}
        tokenStatus={currentUser?.meta_token_status || ''}
        capiStatus={currentUser?.meta_capi_status || ''}
        appId={currentUser?.meta_app_id || ''}
      />

      <WhatsAppIdentityCard
        tokenStatus={currentUser?.meta_token_status || ''}
        displayNumber={currentUser?.meta_whatsapp_status || ''}
      />

      {!hasCredentials && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">Credenciais Meta não configuradas</p>
                <p className="text-sm text-muted-foreground">
                  Configure o Pixel ID e Token CAPI nas Conexões.
                </p>
              </div>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings/connections">
                Configurar <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <RemarketingCustomerTable
        selectedIds={selectedIds}
        onToggleId={toggleId}
        onSelectPage={selectPage}
        onSelectAllFiltered={selectAllFiltered}
        onClearSelection={clearSelection}
      />

      <SyncProgressTracker
        isSyncing={sync.isSyncing}
        progress={sync.progress}
        syncedCount={sync.syncedCount}
        failedCount={sync.failedCount}
        totalSelected={sync.totalSelected}
        status={sync.status}
      />

      <div className="flex justify-end gap-2">
        {sync.isSyncing && (
          <Button variant="destructive" onClick={sync.stop}>
            <StopCircle className="h-4 w-4 mr-2" /> Parar
          </Button>
        )}
        <Button
          size="lg"
          onClick={() => setConfirmOpen(true)}
          disabled={selectedIds.size === 0 || !hasCredentials || sync.isSyncing || fetching}
          className="gap-2"
        >
          {fetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          Enviar para Meta ({selectedIds.size})
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar envio para Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a enviar {selectedIds.size} contato(s) para o Meta via Conversions
              API. Os dados (email e telefone) serão enviados com hash SHA-256 conforme as melhores
              práticas do Meta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSend}>Confirmar envio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <RemarketingLogsCard />
    </div>
  )
}
