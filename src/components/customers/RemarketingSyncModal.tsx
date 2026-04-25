import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { syncRemarketing, Customer } from '@/services/customers'
import pb from '@/lib/pocketbase/client'
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

interface RemarketingSyncModalProps {
  isOpen: boolean
  onClose: () => void
  searchTerm?: string
  phaseFilter?: string
  sourceFilter?: string
}

export function RemarketingSyncModal({
  isOpen,
  onClose,
  searchTerm = '',
  phaseFilter = 'all',
  sourceFilter = '',
}: RemarketingSyncModalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [validLeads, setValidLeads] = useState<Customer[]>([])
  const [totalFiltered, setTotalFiltered] = useState(0)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Progress state
  const [progress, setProgress] = useState(0)
  const [syncedCount, setSyncedCount] = useState(0)
  const [failedLeads, setFailedLeads] = useState<{ lead: Customer; error: string }[]>([])
  const [isFinished, setIsFinished] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      // Reset state on close
      setProgress(0)
      setSyncedCount(0)
      setFailedLeads([])
      setIsFinished(false)
      setSyncError(null)
      return
    }

    const fetchFilteredLeads = async () => {
      setIsLoading(true)
      try {
        const filters: string[] = []
        if (searchTerm) {
          const safeSearch = searchTerm.replace(/"/g, '\\"')
          filters.push(
            `(name ~ "${safeSearch}" || email ~ "${safeSearch}" || phone ~ "${safeSearch}" || first_name ~ "${safeSearch}" || email_1_value ~ "${safeSearch}" || phone_1_value ~ "${safeSearch}")`,
          )
        }
        if (phaseFilter && phaseFilter !== 'all') {
          const safePhase = phaseFilter.replace(/"/g, '\\"')
          filters.push(`status = "${safePhase}"`)
        }
        if (sourceFilter) {
          const safeSource = sourceFilter.replace(/"/g, '\\"')
          filters.push(`source ~ "${safeSource}"`)
        }

        const filterString = filters.join(' && ')

        const allLeads = await pb.collection('customers').getFullList<Customer>({
          filter: filterString,
          requestKey: null,
        })

        setTotalFiltered(allLeads.length)

        const valid = allLeads.filter((l) => {
          const hasEmail =
            (l.email && l.email.trim() !== '') || (l.email_1_value && l.email_1_value.trim() !== '')
          const hasPhone =
            (l.phone && l.phone.trim() !== '') || (l.phone_1_value && l.phone_1_value.trim() !== '')
          return hasEmail || hasPhone
        })

        setValidLeads(valid)
      } catch (error) {
        console.error('Error fetching leads for sync:', error)
        toast({
          title: 'Erro ao carregar leads',
          description: 'Não foi possível carregar os leads para sincronização.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFilteredLeads()
  }, [isOpen, searchTerm, phaseFilter, sourceFilter, toast])

  const handleSync = async () => {
    if (!user?.meta_pixel_id || !user?.meta_capi_token) {
      setSyncError(
        'O ID do Pixel ou o Token da API de Conversões não estão configurados. Vá para Configurações para preenchê-los.',
      )
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    setProgress(0)
    setSyncedCount(0)
    setFailedLeads([])
    setIsFinished(false)

    // Pre-flight check (Handshake)
    try {
      await pb.send('/backend/v1/meta-test-connection', {
        method: 'POST',
        body: JSON.stringify({
          pixelId: user.meta_pixel_id,
          capiToken: user.meta_capi_token,
        }),
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error: any) {
      setIsSyncing(false)
      const errorMsg =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.message ||
        'Erro de autenticação com o Meta'
      setSyncError(`Falha na validação do Token (Pre-flight): ${errorMsg}`)
      return
    }

    // Client-side batching for Real-time Progress & explicitly listing failed leads
    const BATCH_SIZE = 50
    let currentSynced = 0

    for (let i = 0; i < validLeads.length; i += BATCH_SIZE) {
      const batch = validLeads.slice(i, i + BATCH_SIZE)
      const batchIds = batch.map((l) => l.id)

      try {
        const result = await syncRemarketing(batchIds, searchTerm, 'Lead')
        currentSynced += result.synced
        setSyncedCount(currentSynced)
      } catch (error: any) {
        const errorMsg = error.response?.message || error.message || 'Erro desconhecido no lote'
        const failures = batch.map((lead) => ({
          lead,
          error: errorMsg,
        }))
        setFailedLeads((prev) => [...prev, ...failures])
      }

      setProgress(Math.round(((i + batch.length) / validLeads.length) * 100))
    }

    setIsSyncing(false)
    setIsFinished(true)

    if (currentSynced === validLeads.length && validLeads.length > 0) {
      toast({
        title: 'Sincronização concluída',
        description: `${currentSynced} leads foram sincronizados com sucesso.`,
      })
    } else if (currentSynced > 0) {
      toast({
        title: 'Sincronização parcial',
        description: `${currentSynced} leads sincronizados. Houve falhas.`,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Falha na sincronização',
        description: `Nenhum lead pôde ser sincronizado.`,
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Sincronizar Remarketing (Meta CAPI)</DialogTitle>
          <DialogDescription asChild className="space-y-4 pt-4 text-base text-foreground">
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {!isSyncing && !isFinished && (
                    <>
                      <p>
                        Isso enviará {totalFiltered} leads
                        {searchTerm ? ` filtrados pela busca '${searchTerm}'` : ' filtrados'} para o
                        Meta, permitindo criar campanhas segmentadas.
                      </p>
                      <p>
                        <strong>Evento de Conversão / Tag:</strong> Lead (Padrão)
                      </p>
                      <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md border">
                        Apenas contatos com email ou telefone válidos serão sincronizados via hash
                        SHA256 para manter a segurança e conformidade com o Meta.
                        <span className="block mt-2 font-medium text-foreground flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                          {validLeads.length} contatos válidos encontrados
                        </span>
                      </div>
                      {syncError && (
                        <div className="mt-4 p-4 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm font-medium flex gap-2 items-start">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <p>{syncError}</p>
                        </div>
                      )}
                    </>
                  )}

                  {(isSyncing || isFinished) && (
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm font-medium">
                          <span>Progresso</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div className="bg-muted rounded-lg p-3 border">
                          <div className="text-2xl font-bold text-green-600">{syncedCount}</div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            Sucesso
                          </div>
                        </div>
                        <div className="bg-muted rounded-lg p-3 border">
                          <div className="text-2xl font-bold text-red-600">
                            {failedLeads.length}
                          </div>
                          <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                            Falhas
                          </div>
                        </div>
                      </div>

                      {failedLeads.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold flex items-center gap-2 text-destructive">
                            <AlertTriangle className="h-4 w-4" /> Leads com falha
                          </h4>
                          <ScrollArea className="h-32 border rounded-md bg-muted/30 p-2">
                            <div className="space-y-2">
                              {failedLeads.map((f, i) => (
                                <div
                                  key={i}
                                  className="text-xs border-b border-border/50 pb-2 last:border-0 last:pb-0"
                                >
                                  <div className="font-medium">{f.lead.name}</div>
                                  <div className="text-destructive/80 text-[10px] truncate">
                                    {f.error}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {isFinished ? (
            <Button onClick={onClose} className="w-full">
              Concluir
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={isSyncing || isLoading}>
                Cancelar
              </Button>
              <Button
                onClick={handleSync}
                disabled={isSyncing || isLoading || validLeads.length === 0}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Confirmar Envio'
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
