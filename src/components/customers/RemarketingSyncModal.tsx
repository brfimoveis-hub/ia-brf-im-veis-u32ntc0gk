import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { syncRemarketing, Customer } from '@/services/customers'
import pb from '@/lib/pocketbase/client'
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  StopCircle,
  Settings,
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SystemLog } from '@/services/system_logs'
import { getErrorMessage } from '@/lib/pocketbase/errors'

interface RemarketingSyncModalProps {
  isOpen: boolean
  onClose: () => void
  searchTerm?: string
  phaseFilter?: string
  sourceFilter?: string
  leads?: Customer[]
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
  const navigate = useNavigate()

  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'stopped' | 'finished'>('idle')
  const isSyncing = syncStatus === 'syncing'

  const [isLoading, setIsLoading] = useState(true)
  const [validLeads, setValidLeads] = useState<Customer[]>([])
  const [syncError, setSyncError] = useState<string | null>(null)

  // Sync Settings
  const [batchSize, setBatchSize] = useState<number>(50)
  const [intervalMinutes, setIntervalMinutes] = useState<number>(2)

  // Resume Strategies & Selection
  const [resumeMode, setResumeMode] = useState<'all' | 'sequence' | 'letter_from' | 'letter_exact'>(
    'all',
  )
  const [resumeLetter, setResumeLetter] = useState('A')
  const [containsFilter, setContainsFilter] = useState('')
  const [lastSyncLog, setLastSyncLog] = useState<SystemLog | null>(null)

  // Progress state
  const [progress, setProgress] = useState(0)
  const [syncedCount, setSyncedCount] = useState(0)
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0)
  const [totalBatches, setTotalBatches] = useState(0)
  const [failedLeads, setFailedLeads] = useState<{ lead: Customer; error: string }[]>([])

  const isStoppedRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      setSyncStatus('idle')
      setProgress(0)
      setSyncedCount(0)
      setFailedLeads([])
      setSyncError(null)
      setContainsFilter('')
      setResumeMode('all')
      return
    }

    const fetchInitialData = async () => {
      setIsLoading(true)
      try {
        // Fetch last sync log for resuming
        const logs = await pb.collection('system_logs').getList<SystemLog>(1, 1, {
          filter: 'type = "remarketing_log"',
          sort: '-created',
        })
        if (logs.items.length > 0) {
          setLastSyncLog(logs.items[0])
        }

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
          sort: 'name', // Sorted by name to make sequence and letter strategies logical
          requestKey: null,
        })

        const valid = allLeads.filter((l) => {
          const hasEmail =
            (l.email && l.email.trim() !== '') || (l.email_1_value && l.email_1_value.trim() !== '')
          const hasPhone =
            (l.phone && l.phone.trim() !== '') || (l.phone_1_value && l.phone_1_value.trim() !== '')
          return hasEmail || hasPhone
        })

        setValidLeads(valid)
      } catch (error) {
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os leads ou histórico.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchInitialData()
  }, [isOpen, searchTerm, phaseFilter, sourceFilter, toast])

  const leadsToSync = useMemo(() => {
    let filtered = validLeads

    if (containsFilter) {
      const lowerFilter = containsFilter.toLowerCase()
      filtered = filtered.filter((l) => {
        const nameMatch = (l.name || '').toLowerCase().includes(lowerFilter)
        const notesMatch = (l.notes || '').toLowerCase().includes(lowerFilter)
        const tagsMatch = Array.isArray(l.tags)
          ? l.tags.some((t) => typeof t === 'string' && t.toLowerCase().includes(lowerFilter))
          : false
        return nameMatch || notesMatch || tagsMatch
      })
    }

    if (resumeMode === 'letter_exact') {
      const letter = resumeLetter.toLowerCase()
      if (letter) {
        filtered = filtered.filter((l) => {
          const nameMatch = (l.name || '').toLowerCase().startsWith(letter)
          const firstNameMatch = (l.first_name || '').toLowerCase().startsWith(letter)
          return nameMatch || firstNameMatch
        })
      }
    } else if (resumeMode === 'letter_from') {
      const letter = resumeLetter.toLowerCase()
      if (letter) {
        const index = filtered.findIndex((l) => {
          const n = (l.name || l.first_name || '').toLowerCase()
          return n.localeCompare(letter) >= 0
        })
        if (index >= 0) {
          filtered = filtered.slice(index)
        } else {
          filtered = []
        }
      }
    } else if (resumeMode === 'sequence' && lastSyncLog?.payload?.last_customer_id) {
      const lastId = lastSyncLog.payload.last_customer_id
      const index = filtered.findIndex((l) => l.id === lastId)
      if (index >= 0) {
        filtered = filtered.slice(index + 1)
      }
    }

    return filtered
  }, [validLeads, containsFilter, resumeMode, resumeLetter, lastSyncLog])

  const sha256 = async (message: string) => {
    const msgBuffer = new TextEncoder().encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  }

  const handleSync = async () => {
    if (!user?.meta_pixel_id || !user?.meta_capi_token) {
      setSyncError('O ID do Pixel ou o Token da API de Conversões não estão configurados.')
      return
    }

    isStoppedRef.current = false
    setSyncStatus('syncing')
    setSyncError(null)
    setProgress(0)
    setSyncedCount(0)
    setFailedLeads([])

    // Freeze list to process so it doesn't mutate during the loop if lastSyncLog updates
    const listToProcess = [...leadsToSync]
    setTotalBatches(Math.ceil(listToProcess.length / Math.max(1, batchSize)))
    setCurrentBatchIndex(0)

    // Pre-flight check
    const lastValidatedStr = user?.meta_last_validated
    let needsValidation = true
    if (lastValidatedStr && user?.meta_token_status === 'valid') {
      const lastValidated = new Date(lastValidatedStr).getTime()
      if (Date.now() - lastValidated < 24 * 60 * 60 * 1000) {
        needsValidation = false
      }
    }

    if (needsValidation) {
      try {
        await pb.send('/backend/v1/meta-test-connection', {
          method: 'POST',
          body: JSON.stringify({ pixelId: user.meta_pixel_id, capiToken: user.meta_capi_token }),
          headers: { 'Content-Type': 'application/json' },
        })
        await pb.collection('users').authRefresh()
      } catch (error: unknown) {
        setSyncStatus('idle')
        setSyncError(`Falha na validação do Token (Pre-flight): ${getErrorMessage(error)}`)
        return
      }
    }

    const currentBatchSize = Math.max(1, batchSize)
    let currentSynced = 0

    for (let i = 0; i < listToProcess.length; i += currentBatchSize) {
      if (isStoppedRef.current) break

      setCurrentBatchIndex(Math.floor(i / currentBatchSize) + 1)
      const batch = listToProcess.slice(i, i + currentBatchSize)

      const payloads = await Promise.all(
        batch.map(async (l) => {
          let email = l.email_1_value || l.email || ''
          let phone = l.phone_1_value || l.phone || ''
          email = email.trim().toLowerCase()
          phone = phone.replace(/[^0-9]/g, '')
          if (phone.length === 10 || phone.length === 11) phone = '55' + phone

          return {
            id: l.id,
            em: email ? await sha256(email) : undefined,
            ph: phone ? await sha256(phone) : undefined,
            tags: l.tags || [],
          }
        }),
      )

      try {
        const result = await syncRemarketing(
          payloads,
          searchTerm,
          'Lead',
          batchSize,
          intervalMinutes,
        )
        currentSynced += result.synced
        setSyncedCount(currentSynced)

        if (batch.length > 0) {
          const lastCustomer = batch[batch.length - 1]
          const newLog = await pb.collection('system_logs').create<SystemLog>({
            type: 'remarketing_log',
            message: `Remarketing sync batch processed`,
            details: `Synced up to ${lastCustomer.name}`,
            payload: { last_customer_id: lastCustomer.id, last_customer_name: lastCustomer.name },
            user_id: user?.id,
          })
          setLastSyncLog(newLog)
        }
      } catch (error: unknown) {
        const errorMsg = getErrorMessage(error)
        setFailedLeads((prev) => [...prev, ...batch.map((lead) => ({ lead, error: errorMsg }))])
      }

      setProgress(Math.round(((i + batch.length) / listToProcess.length) * 100))

      if (i + currentBatchSize < listToProcess.length && !isStoppedRef.current) {
        const waitTimeMs = intervalMinutes * 60 * 1000
        const chunkMs = 500
        for (let w = 0; w < waitTimeMs; w += chunkMs) {
          if (isStoppedRef.current) break
          await new Promise((resolve) => setTimeout(resolve, chunkMs))
        }
      }
    }

    if (isStoppedRef.current) {
      setSyncStatus('stopped')
      setResumeMode('sequence')
      toast({ title: 'Sincronização parada', description: 'O processo foi interrompido.' })
    } else {
      setSyncStatus('finished')
      if (currentSynced === listToProcess.length && listToProcess.length > 0) {
        toast({
          title: 'Sincronização concluída',
          description: `${currentSynced} leads foram sincronizados.`,
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
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[95vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Sincronizar Remarketing (Meta CAPI)</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 mt-2 pb-6">
              <div
                className={`space-y-4 transition-opacity ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <p className="text-sm text-muted-foreground">
                  Envie leads para o Meta para criar campanhas de remarketing segmentadas.
                </p>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md border space-y-2">
                  <p className="text-primary font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Integração com Pixel Ativo
                  </p>
                  <p className="flex items-center gap-1 font-medium text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {validLeads.length} contatos válidos nos filtros de base
                  </p>
                </div>

                <div className="space-y-4 p-4 border rounded-md bg-card shadow-sm">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Selecionar por todos os lyds que contém ........
                    </Label>
                    <Input
                      placeholder="Ex: interessado, VIP, projeto X..."
                      value={containsFilter}
                      onChange={(e) => setContainsFilter(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-sm font-semibold">Estratégia de Retomada / Envio</Label>
                    <RadioGroup
                      value={resumeMode}
                      onValueChange={(v: any) => setResumeMode(v)}
                      className="flex flex-col gap-2 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="mode-all" />
                        <Label htmlFor="mode-all" className="cursor-pointer font-normal">
                          Lista completa selecionada
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sequence" id="mode-seq" disabled={!lastSyncLog} />
                        <Label
                          htmlFor="mode-seq"
                          className="cursor-pointer font-normal text-muted-foreground aria-[disabled=false]:text-foreground"
                        >
                          Iniciar na sequência do último envio
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="letter_from" id="mode-let-from" />
                        <Label htmlFor="mode-let-from" className="cursor-pointer font-normal">
                          Iniciar a partir da letra
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="letter_exact" id="mode-let-exact" />
                        <Label htmlFor="mode-let-exact" className="cursor-pointer font-normal">
                          Apenas a letra inicial
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {(resumeMode === 'letter_from' || resumeMode === 'letter_exact') && (
                    <div className="space-y-1.5 pt-2">
                      <Label className="text-xs text-muted-foreground">Letra Inicial</Label>
                      <Input
                        maxLength={1}
                        value={resumeLetter}
                        onChange={(e) => setResumeLetter(e.target.value.toUpperCase())}
                        placeholder="A"
                        className="w-16 text-center font-bold uppercase"
                      />
                    </div>
                  )}

                  {resumeMode === 'sequence' && lastSyncLog && (
                    <div className="bg-muted/50 p-2 rounded-md text-xs border">
                      Último lead enviado:{' '}
                      <span className="font-semibold text-foreground">
                        {lastSyncLog.payload.last_customer_name}
                      </span>
                    </div>
                  )}

                  <div className="pt-3 border-t flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">Leads selecionados para envio:</span>
                    <span className="text-lg font-bold text-primary">{leadsToSync.length}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Tamanho do Lote</Label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={batchSize}
                      onChange={(e) => setBatchSize(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Intervalo (Minutos)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="60"
                      value={intervalMinutes}
                      onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    />
                  </div>
                </div>

                {(!user?.meta_pixel_id?.trim() || !user?.meta_capi_token?.trim()) && (
                  <div className="p-4 rounded-md border border-amber-500 bg-amber-500/10 text-amber-700 text-sm font-medium flex flex-col gap-3">
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-base font-semibold">Credenciais Ausentes</p>
                        <p className="font-normal mt-1">
                          ID do Pixel ou Token não configurados. A sincronização requer estas
                          informações para comunicar com o Meta.
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-fit mt-1 bg-amber-600 hover:bg-amber-700 text-white border-none"
                      onClick={() => {
                        onClose()
                        navigate('/configuracoes')
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Configurar Integração Meta
                    </Button>
                  </div>
                )}

                {syncError && (
                  <div className="p-3 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm font-medium flex flex-col gap-2">
                    <div className="flex gap-2 items-start">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>{syncError}</p>
                    </div>
                    {syncError ===
                      'O ID do Pixel ou o Token da API de Conversões não estão configurados.' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-fit mt-1"
                        onClick={() => {
                          onClose()
                          navigate('/configuracoes')
                        }}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Atualizar Configurações
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {syncStatus !== 'idle' && (
                <div className="space-y-5 py-4 border-t mt-4 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      {syncStatus === 'syncing' && (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin text-primary" /> Sincronizando...
                        </>
                      )}
                      {syncStatus === 'stopped' && (
                        <>
                          <StopCircle className="h-4 w-4 text-orange-500" /> Sincronização Parada
                        </>
                      )}
                      {syncStatus === 'finished' && (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-green-500" /> Sincronização
                          Concluída
                        </>
                      )}
                    </h3>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm font-medium">
                      <span>
                        {syncStatus === 'syncing'
                          ? `Enviando lote ${currentBatchIndex}/${totalBatches}...`
                          : 'Progresso Final'}
                      </span>
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
                      <div className="text-2xl font-bold text-red-600">{failedLeads.length}</div>
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
                              <div className="font-medium flex items-center gap-2">
                                {(f.lead.status === 'Lead Novo' ||
                                  f.lead.status === 'Base de Clientes/Novo LYD' ||
                                  f.lead.status === '') && (
                                  <span className="relative flex h-2 w-2" title="Novo Lead">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                  </span>
                                )}
                                {f.lead.name}
                              </div>
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
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-background">
          {syncStatus === 'finished' ? (
            <Button onClick={onClose} className="w-full">
              Concluir
            </Button>
          ) : syncStatus === 'syncing' ? (
            <Button
              variant="destructive"
              onClick={() => {
                isStoppedRef.current = true
              }}
              className="w-full sm:w-auto font-medium"
            >
              <StopCircle className="mr-2 h-4 w-4" /> Parar envio
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSync}
                disabled={
                  isLoading ||
                  leadsToSync.length === 0 ||
                  !user?.meta_pixel_id?.trim() ||
                  !user?.meta_capi_token?.trim()
                }
                className="w-full sm:w-auto"
              >
                {syncStatus === 'stopped' ? 'Retomar envio' : 'Iniciar'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
