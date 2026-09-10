import { useState, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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
import {
  Send,
  ArrowRight,
  AlertCircle,
  Loader2,
  StopCircle,
  RefreshCw,
  MessageSquare,
  Database,
  FileCheck2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { RemarketingStatusBanner } from '@/components/remarketing/RemarketingStatusBanner'
import { RemarketingCustomerTable } from '@/components/remarketing/RemarketingCustomerTable'
import { SyncProgressTracker } from '@/components/remarketing/SyncProgressTracker'
import { RemarketingLogsCard } from '@/components/remarketing/RemarketingLogsCard'
import { WhatsAppIdentityCard } from '@/components/remarketing/WhatsAppIdentityCard'
import { WhatsAppCampaignComposer } from '@/components/remarketing/WhatsAppCampaignComposer'
import { WhatsAppCampaignHistory } from '@/components/remarketing/WhatsAppCampaignHistory'
import { WhatsAppTemplatesManager } from '@/components/remarketing/WhatsAppTemplatesManager'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const initialTab = searchParams.get('tab') || 'campaigns'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedTemplateForCampaign, setSelectedTemplateForCampaign] = useState('')
  const sync = useRemarketingSync()

  // Sincroniza tab na URL para links diretos e persistência (ex: /settings/remarketing?tab=templates)
  const handleTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (newTab === 'campaigns') {
            next.delete('tab')
          } else {
            next.set('tab', newTab)
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

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

  const hasWhatsAppCredentials =
    !!currentUser?.meta_whatsapp_phone_number_id?.trim() &&
    !!currentUser?.meta_whatsapp_access_token?.trim()

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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Remarketing & Campanhas
        </h1>
        <p className="text-muted-foreground mt-2 text-lg max-w-2xl">
          Dispare campanhas de WhatsApp personalizadas pelo número da Bia e sincronize audiências
          com a Meta via Conversions API (CAPI).
        </p>
      </div>

      <RemarketingStatusBanner
        hasAccessToken={
          !!(
            currentUser?.meta_capi_token?.trim() || currentUser?.meta_whatsapp_access_token?.trim()
          )
        }
        tokenStatus={
          currentUser?.meta_capi_status === 'connected' ||
          currentUser?.meta_capi_status === 'active'
            ? 'valid'
            : currentUser?.meta_token_status || ''
        }
        capiStatus={currentUser?.meta_capi_status || ''}
        appId={currentUser?.meta_app_id || ''}
      />

      <WhatsAppIdentityCard
        tokenStatus={currentUser?.meta_token_status || ''}
        displayNumber={currentUser?.meta_whatsapp_status || ''}
      />

      {(!hasCredentials || !hasWhatsAppCredentials) && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-foreground">
                  {!hasWhatsAppCredentials && !hasCredentials
                    ? 'Credenciais Meta WhatsApp e CAPI incompletas'
                    : !hasWhatsAppCredentials
                      ? 'WhatsApp Cloud API não conectado'
                      : 'Credenciais Meta CAPI não configuradas'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Verifique suas credenciais em Conexões para garantir disparos sem interrupções.
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

      {/* Tabs principais da tela de Remarketing */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
          <TabsList className="grid grid-cols-3 w-full sm:w-[600px] h-11 p-1 bg-muted/80">
            <TabsTrigger
              value="campaigns"
              className="flex items-center justify-center gap-2 font-medium text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <MessageSquare className="h-4 w-4 text-green-600" />
              <span>Campanhas WhatsApp</span>
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="flex items-center justify-center gap-2 font-medium text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileCheck2 className="h-4 w-4 text-primary" />
              <span>Modelos (Templates)</span>
            </TabsTrigger>
            <TabsTrigger
              value="capi-sync"
              className="flex items-center justify-center gap-2 font-medium text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Database className="h-4 w-4 text-blue-600" />
              <span>Sincronização CAPI</span>
            </TabsTrigger>
          </TabsList>

          {activeTab !== 'templates' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleTabChange('templates')}
              className="text-xs gap-1.5 self-start sm:self-auto h-9"
            >
              <FileCheck2 className="h-3.5 w-3.5 text-primary" />
              Ver Modelos Meta
            </Button>
          )}
        </div>

        {/* ABA 1: Campanhas WhatsApp + CAPI conjugado */}
        <TabsContent value="campaigns" className="space-y-6">
          <WhatsAppCampaignComposer
            selectedCount={selectedIds.size}
            selectedCustomerIds={Array.from(selectedIds)}
            hasWhatsAppCredentials={hasWhatsAppCredentials}
            hasCapiCredentials={hasCredentials}
            initialTemplateName={selectedTemplateForCampaign}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  1. Selecione os Contatos / Segmentos da Campanha
                </h3>
                <p className="text-sm text-muted-foreground">
                  Filtre por status, perfil ou busca e selecione os contatos que receberão a
                  mensagem.
                </p>
              </div>
            </div>

            <RemarketingCustomerTable
              selectedIds={selectedIds}
              onToggleId={toggleId}
              onSelectPage={selectPage}
              onSelectAllFiltered={selectAllFiltered}
              onClearSelection={clearSelection}
            />
          </div>

          <WhatsAppCampaignHistory />
        </TabsContent>

        {/* ABA 2: Modelos (Templates de WhatsApp com aprovação Meta ao vivo) */}
        <TabsContent value="templates" className="space-y-6">
          <WhatsAppTemplatesManager
            hasWhatsAppCredentials={hasWhatsAppCredentials}
            onTemplateSelectedForCampaign={(templateName, templateLang) => {
              setSelectedTemplateForCampaign(templateName)
              handleTabChange('campaigns')
              toast({
                title: 'Modelo selecionado',
                description: `O modelo "${templateName}" (${templateLang || 'pt_BR'}) foi selecionado na aba Campanhas.`,
              })
            }}
          />
        </TabsContent>

        {/* ABA 3: Sincronização direta CAPI pura */}
        <TabsContent value="capi-sync" className="space-y-6">
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Envio Direto de Audiência para o Pixel / Conversions API
              </h3>
              <p className="text-sm text-muted-foreground">
                Envia hashes SHA-256 dos dados para o Meta criar públicos semelhantes e remarketing
                em anúncios patrocinados.
              </p>
            </div>

            <RemarketingCustomerTable
              selectedIds={selectedIds}
              onToggleId={toggleId}
              onSelectPage={selectPage}
              onSelectAllFiltered={selectAllFiltered}
              onClearSelection={clearSelection}
            />
          </div>

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
              {fetching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Enviar para Meta CAPI ({selectedIds.size})
            </Button>
          </div>

          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar envio para Meta CAPI</AlertDialogTitle>
                <AlertDialogDescription>
                  Você está prestes a enviar {selectedIds.size} contato(s) para o Meta via
                  Conversions API. Os dados (email e telefone) serão enviados com hash SHA-256
                  conforme as melhores práticas do Meta.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmSend}>Confirmar envio</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TabsContent>
      </Tabs>

      <RemarketingLogsCard />
    </div>
  )
}
