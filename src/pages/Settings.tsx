import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Save,
  Key,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  Facebook,
  Loader2,
  Activity,
  AlertTriangle,
  AlertCircle,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useBlocker } from 'react-router-dom'
import { useRealtime } from '@/hooks/use-realtime'
import { getCadences, updateCadence, type Cadence } from '@/services/cadences'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'
import { RecentPerformance } from '@/components/RecentPerformance'
import { LeadOriginsDashboard } from '@/components/LeadOriginsDashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export default function Settings() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingMeta, setIsSavingMeta] = useState(false)
  const [isSavingAI, setIsSavingAI] = useState(false)

  const [prompt, setPrompt] = useState('')
  const [aiName, setAiName] = useState('')
  const [aiVoiceId, setAiVoiceId] = useState('')
  const [aiAvatarFile, setAiAvatarFile] = useState<File | null>(null)

  // Meta Ads State
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaTestEventCode, setMetaTestEventCode] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [metaTagsList, setMetaTagsList] = useState<{ id: string; name: string }[]>([])
  const [metaCampaignPhone, setMetaCampaignPhone] = useState('')

  // UI State
  const [newTagName, setNewTagName] = useState('')
  const [newTagId, setNewTagId] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [gtmStatus, setGtmStatus] = useState<'checking' | 'active' | 'error'>('checking')
  const [lastFbTraceId, setLastFbTraceId] = useState('')
  const [lastErrorMsg, setLastErrorMsg] = useState('')
  const [lastErrorCode, setLastErrorCode] = useState<number | string>('')
  const [missingScopes, setMissingScopes] = useState<string[]>([])

  const [initialMeta, setInitialMeta] = useState({
    pixel: '',
    test: '',
    capiToken: '',
    tags: '[]',
    prompt: '',
    aiName: '',
    aiVoiceId: '',
    aiAvatar: '',
    campaignPhone: '',
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Cadence Audit State
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [editingCadence, setEditingCadence] = useState<Cadence | null>(null)
  const [editAiInstructions, setEditAiInstructions] = useState('')
  const [isSavingCadence, setIsSavingCadence] = useState(false)

  useEffect(() => {
    const loadCadences = async () => {
      try {
        const data = await getCadences()
        setCadences(data)
      } catch (error) {
        console.error('Failed to load cadences:', error)
      }
    }
    if (user) {
      loadCadences()
    }
  }, [user])

  useRealtime('cadences', async () => {
    try {
      const data = await getCadences()
      setCadences(data)
    } catch (error) {
      console.error('Failed to load cadences:', error)
    }
  })

  const activeCadences = cadences.filter((c) => c.is_active)
  const activeCadencesCount = activeCadences.length

  const getCadenceIssues = (cadence: Cadence) => {
    const issues = []
    if (!cadence.title?.trim()) issues.push('Sem título')
    if (!cadence.content?.trim()) issues.push('Sem conteúdo')
    return issues
  }

  const intactCadencesCount = activeCadences.filter((c) => getCadenceIssues(c).length === 0).length

  const handleSaveCadenceInstructions = async () => {
    if (!editingCadence) return
    setIsSavingCadence(true)
    try {
      await updateCadence(editingCadence.id, {
        ai_instructions: editAiInstructions,
      })
      toast({
        title: 'Regras de IA atualizadas',
        description: 'As regras da cadência foram salvas com sucesso.',
      })
      setEditingCadence(null)
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao atualizar a cadência.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCadence(false)
    }
  }

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      if (e.record.meta_token_status !== user?.meta_token_status) {
        pb.collection('users')
          .authRefresh()
          .catch(() => {})
      }
    }
  })

  useEffect(() => {
    const checkGTM = () => {
      const gtmId = 'GTM-MWML5KFQ'
      const hasGtmScript = document.querySelector(`script[src*="${gtmId}"]`) !== null
      const isGtmObjectPresent =
        (window as any).google_tag_manager && (window as any).google_tag_manager[gtmId]

      if (hasGtmScript || isGtmObjectPresent) {
        setGtmStatus('active')
      } else {
        setGtmStatus('error')
      }
    }

    checkGTM()
    const timer = setTimeout(checkGTM, 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user && !isInitialized) {
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaTestEventCode(user.meta_test_event_code || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setMetaCampaignPhone(user.meta_campaign_phone || '')
      setMetaTagsList(user.meta_tags_list || [])

      setPrompt(user.ai_instructions || '')
      setAiName(user.ai_name || '')
      setAiVoiceId(user.ai_voice_id || '')

      setInitialMeta({
        pixel: user.meta_pixel_id || '',
        test: user.meta_test_event_code || '',
        capiToken: user.meta_capi_token || '',
        tags: JSON.stringify(user.meta_tags_list || []),
        prompt: user.ai_instructions || '',
        aiName: user.ai_name || '',
        aiVoiceId: user.ai_voice_id || '',
        aiAvatar: user.ai_avatar || '',
        campaignPhone: user.meta_campaign_phone || '',
      })
      setIsInitialized(true)
    }
  }, [user, isInitialized])

  const isDirty =
    metaPixelId !== initialMeta.pixel ||
    metaTestEventCode !== initialMeta.test ||
    metaCapiToken !== initialMeta.capiToken ||
    metaCampaignPhone !== initialMeta.campaignPhone ||
    JSON.stringify(metaTagsList) !== initialMeta.tags ||
    prompt !== initialMeta.prompt ||
    aiName !== initialMeta.aiName ||
    aiVoiceId !== initialMeta.aiVoiceId ||
    aiAvatarFile !== null

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: any) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty],
  )
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?')
      if (confirmLeave) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const handleNext = (e: Event) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('roulette-next', handleNext)
    return () => window.removeEventListener('roulette-next', handleNext)
  }, [isDirty])

  const getCleanMeta = () => {
    const cleanPixelId = metaPixelId.replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
    const cleanTestCode = metaTestEventCode.trim()
    const cleanCapiToken = metaCapiToken.trim()
    const cleanCampaignPhone = metaCampaignPhone.trim()
    return { cleanPixelId, cleanTestCode, cleanCapiToken, cleanCampaignPhone }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!user?.id) throw new Error('Usuário não autenticado')
      const { cleanPixelId, cleanTestCode, cleanCapiToken, cleanCampaignPhone } = getCleanMeta()

      const formData = new FormData()
      formData.append('meta_pixel_id', cleanPixelId)
      formData.append('meta_test_event_code', cleanTestCode)
      formData.append('meta_capi_token', cleanCapiToken)
      formData.append('meta_campaign_phone', cleanCampaignPhone)
      formData.append('meta_tags_list', JSON.stringify(metaTagsList))
      formData.append('ai_instructions', prompt.substring(0, 100000))
      formData.append('ai_name', aiName)
      formData.append('ai_voice_id', aiVoiceId)

      if (aiAvatarFile) {
        formData.append('ai_avatar', aiAvatarFile)
      }

      if (cleanPixelId !== initialMeta.pixel || cleanCapiToken !== initialMeta.capiToken) {
        formData.append('meta_token_status', 'untested')
        formData.append('meta_last_validated', '')
      }

      const updatedUser = await pb.collection('users').update(user.id, formData)
      await pb.collection('users').authRefresh()

      setInitialMeta({
        pixel: updatedUser.meta_pixel_id || '',
        test: updatedUser.meta_test_event_code || '',
        capiToken: updatedUser.meta_capi_token || '',
        tags: JSON.stringify(updatedUser.meta_tags_list || []),
        prompt: updatedUser.ai_instructions || '',
        aiName: updatedUser.ai_name || '',
        aiVoiceId: updatedUser.ai_voice_id || '',
        aiAvatar: updatedUser.ai_avatar || '',
        campaignPhone: updatedUser.meta_campaign_phone || '',
      })
      setAiAvatarFile(null)

      setMetaPixelId(cleanPixelId)
      setMetaTestEventCode(cleanTestCode)
      setMetaCapiToken(cleanCapiToken)
      setMetaCampaignPhone(cleanCampaignPhone)

      setTimeout(() => {
        setIsSaving(false)
        toast({
          title: 'Configurações de IA salvas com sucesso!',
          description: 'As alterações foram aplicadas com sucesso.',
        })
      }, 500)
    } catch (error: any) {
      setIsSaving(false)
      const fieldErrors = Object.values(error.response?.data || {})
        .map((e: any) => e.message)
        .join(', ')
      toast({
        title: 'Erro ao salvar',
        description: fieldErrors || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveAI = async () => {
    setIsSavingAI(true)
    try {
      if (!user?.id) throw new Error('Usuário não autenticado')

      const formData = new FormData()
      formData.append('ai_instructions', prompt.substring(0, 100000))
      formData.append('ai_name', aiName)
      formData.append('ai_voice_id', aiVoiceId)

      if (aiAvatarFile) {
        formData.append('ai_avatar', aiAvatarFile)
      }

      const updatedUser = await pb.collection('users').update(user.id, formData)
      await pb.collection('users').authRefresh()

      setInitialMeta((prev) => ({
        ...prev,
        prompt: updatedUser.ai_instructions || '',
        aiName: updatedUser.ai_name || '',
        aiVoiceId: updatedUser.ai_voice_id || '',
        aiAvatar: updatedUser.ai_avatar || '',
      }))
      setAiAvatarFile(null)

      toast({
        title: 'Configurações de IA salvas com sucesso!',
        description: 'A identidade e comportamento foram atualizados.',
      })
    } catch (error: any) {
      const fieldErrors = Object.values(error.response?.data || {})
        .map((e: any) => e.message)
        .join(', ')
      toast({
        title: 'Erro ao salvar',
        description:
          fieldErrors || 'Não foi possível salvar as configurações de IA. Verifique os dados.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingAI(false)
    }
  }

  const handleSaveMeta = async () => {
    setIsSavingMeta(true)
    try {
      if (!user?.id) throw new Error('Usuário não autenticado')
      const { cleanPixelId, cleanTestCode, cleanCapiToken, cleanCampaignPhone } = getCleanMeta()

      const updateData: any = {
        meta_pixel_id: cleanPixelId,
        meta_test_event_code: cleanTestCode,
        meta_capi_token: cleanCapiToken,
        meta_campaign_phone: cleanCampaignPhone,
        meta_tags_list: metaTagsList,
      }

      if (cleanPixelId !== initialMeta.pixel || cleanCapiToken !== initialMeta.capiToken) {
        updateData.meta_token_status = 'untested'
        updateData.meta_last_validated = ''
      }

      const updatedUser = await pb.collection('users').update(user.id, updateData)
      await pb.collection('users').authRefresh()

      setInitialMeta((prev) => ({
        ...prev,
        pixel: updatedUser.meta_pixel_id || '',
        test: updatedUser.meta_test_event_code || '',
        capiToken: updatedUser.meta_capi_token || '',
        campaignPhone: updatedUser.meta_campaign_phone || '',
        tags: JSON.stringify(updatedUser.meta_tags_list || []),
      }))

      setMetaPixelId(cleanPixelId)
      setMetaTestEventCode(cleanTestCode)
      setMetaCapiToken(cleanCapiToken)
      setMetaCampaignPhone(cleanCampaignPhone)

      toast({
        title: 'Configurações do Meta salvas!',
        description: 'As alterações foram aplicadas com sucesso. Testando conexão...',
      })

      try {
        await pb.send('/backend/v1/meta-test-connection', {
          method: 'POST',
          body: JSON.stringify({
            pixelId: cleanPixelId,
            capiToken: cleanCapiToken,
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        await pb.collection('users').authRefresh()
        setMissingScopes([])
        toast({
          title: 'Conexão bem-sucedida',
          description:
            'O Pixel ID e Token CAPI foram validados com sucesso e estão prontos para uso.',
        })
      } catch (testError: any) {
        await pb.collection('users').authRefresh()
        const resData = testError.response || {}
        setLastFbTraceId(resData.fbtrace_id || '')
        setLastErrorCode(resData.code || '')
        const errorMsg = resData.message || 'Verifique as credenciais.'
        setLastErrorMsg(errorMsg)
        setMissingScopes(resData.missing_scopes || [])

        toast({
          title: 'Configurações salvas, mas falha no teste com o Meta',
          description: `Erro da API Meta: ${errorMsg}`,
          variant: 'destructive',
        })
      }
    } catch (error: any) {
      const fieldErrors = Object.values(error.response?.data || {})
        .map((e: any) => e.message)
        .join(', ')
      toast({
        title: 'Erro ao salvar',
        description: fieldErrors || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  const testMetaConnection = async () => {
    if (isDirty) {
      toast({
        title: 'Alterações Não Salvas',
        description: 'Por favor, salve as configurações antes de testar a conexão.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingConnection(true)
    try {
      // Body is intentionally empty to pull directly from the DB's single source of truth
      await pb.send('/backend/v1/meta-test-connection', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      setMissingScopes([])
      await pb.collection('users').authRefresh()
      toast({
        title: 'Conexão bem-sucedida',
        description:
          'O Pixel ID e Token CAPI foram validados com sucesso e estão comunicando com o Meta.',
      })
    } catch (error: any) {
      const resData = error.response || {}

      let errorMsg = resData.message || 'Verifique as credenciais.'
      let fbtraceId = resData.fbtrace_id || ''
      let code = resData.code || ''
      let mScopes = resData.missing_scopes || []

      setLastFbTraceId(fbtraceId)
      setLastErrorCode(code)
      setLastErrorMsg(errorMsg)
      setMissingScopes(mScopes)

      await pb.collection('users').authRefresh()

      toast({
        title: 'Erro de Conexão com o Meta',
        description: `Falha na API: ${errorMsg} ${code ? `(Código: ${code})` : ''}`,
        variant: 'destructive',
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Status Logic variables
  const isPixelConfigured = metaPixelId.trim().length > 0

  const metaTokenStatus = user?.meta_token_status || 'untested'

  let connectionBadgeText = 'Não Testado'
  let connectionBadgeColor = 'bg-muted text-muted-foreground'

  if (!user?.meta_pixel_id || !user?.meta_capi_token) {
    connectionBadgeText = 'Configuração Pendente'
    connectionBadgeColor =
      'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 border'
  } else if (
    metaTokenStatus === 'active' ||
    metaTokenStatus === 'valid' ||
    metaTokenStatus === 'Connected'
  ) {
    connectionBadgeText = 'Conectado'
    connectionBadgeColor =
      'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border'
  } else if (
    metaTokenStatus === 'Erro de Validação' ||
    metaTokenStatus === 'invalid' ||
    metaTokenStatus === 'expired' ||
    metaTokenStatus === 'untested'
  ) {
    connectionBadgeText = metaTokenStatus === 'untested' ? 'Não Testado' : 'Erro de Validação'
    connectionBadgeColor =
      metaTokenStatus === 'untested'
        ? 'bg-muted text-muted-foreground'
        : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 border'
  } else {
    connectionBadgeText = 'Não Testado'
    connectionBadgeColor = 'bg-muted text-muted-foreground'
  }

  const gtmStatusText =
    gtmStatus === 'checking'
      ? 'Verificando...'
      : gtmStatus === 'active'
        ? 'Tag GTM Detectada e Ativa'
        : 'Tag GTM Não Detectada (Possível AdBlock)'
  const gtmStatusColor =
    gtmStatus === 'checking'
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      : gtmStatus === 'active'
        ? 'bg-green-500/10 text-green-600 border-green-500/20'
        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-secondary">Configurações da IA</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie o comportamento e o conhecimento do seu agente inteligente.
        </p>
      </div>

      {/* Recent Performance Carousel */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold tracking-tight text-secondary">
            Performance Recente
          </h3>
        </div>
        <RecentPerformance />
      </div>

      <div className="grid gap-8">
        {/* Lead Origins Dashboard */}
        <LeadOriginsDashboard />

        {/* Cadence Audit */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-teal-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 rounded-xl">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Auditoria de Cadências</CardTitle>
                <CardDescription>
                  {activeCadencesCount === intactCadencesCount && activeCadencesCount > 0
                    ? `${intactCadencesCount} cadências íntegras.`
                    : `${activeCadencesCount} cadências ativas. ${intactCadencesCount} íntegras.`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Integridade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cadences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Nenhuma cadência encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cadences.map((cadence) => {
                      const issues = getCadenceIssues(cadence)
                      const isIntact = issues.length === 0 && cadence.is_active
                      const isInactive = !cadence.is_active

                      return (
                        <TableRow key={cadence.id} className={cn(isInactive && 'opacity-60')}>
                          <TableCell className="font-medium">
                            {cadence.title || 'Sem Título'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cadence.is_active ? 'default' : 'secondary'}>
                              {cadence.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isInactive ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : isIntact ? (
                              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border font-medium">
                                Íntegra
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1 items-start">
                                <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 border font-medium">
                                  Atenção: Erro(s)
                                </Badge>
                                <span className="text-[10px] text-red-500 font-medium max-w-[150px] leading-tight">
                                  {issues.join(', ')}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCadence(cadence)
                                setEditAiInstructions(cadence.ai_instructions || '')
                              }}
                            >
                              Editar Regras
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Cadence Management */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-purple-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <SettingsIcon className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <CardTitle className="text-xl">Gerenciamento de Cadências (Pipeline CRM)</CardTitle>
                <CardDescription>
                  Configure os gatilhos e objetivos para as 10 fases do seu processo comercial
                  automático.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
                <Label className="text-sm font-semibold text-secondary">
                  Gatilho Fase 1 para 2 (Contato Inicial)
                </Label>
                <Input defaultValue="Cliente enviou a primeira mensagem (Lead Novo)" />
                <p className="text-xs text-muted-foreground">
                  Regra avaliada pela IA para iniciar a primeira tentativa de contato.
                </p>
              </div>
              <div className="space-y-3 p-4 border rounded-xl bg-muted/20">
                <Label className="text-sm font-semibold text-secondary">
                  Gatilho Fase 4 para 5 (Qualificação)
                </Label>
                <Input defaultValue="IA identificou dor de negócio e confirmou budget" />
                <p className="text-xs text-muted-foreground">
                  Critério de sucesso estabelecido para marcar como Qualificado.
                </p>
              </div>
            </div>
            <Button variant="outline" className="w-full mt-2 font-medium">
              Ver e editar todas as 10 configurações de cadência
            </Button>
          </CardContent>
        </Card>

        {/* AI Identity */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-primary w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3 w-full">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <SettingsIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl">Identidade da IA</CardTitle>
                  <CardDescription>
                    Defina o nome, avatar e voz do seu agente inteligente.
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    aiName.trim().length > 0 && prompt.trim().length > 0 ? 'default' : 'secondary'
                  }
                  className={cn(
                    'whitespace-nowrap w-fit',
                    aiName.trim().length > 0 && prompt.trim().length > 0
                      ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border'
                      : '',
                  )}
                >
                  <Activity className="w-3 h-3 mr-1.5" />
                  {aiName.trim().length > 0 && prompt.trim().length > 0 ? 'IA Ativa' : 'IA Inativa'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <Avatar className="h-20 w-20 border-2 border-muted shadow-sm shrink-0">
                <AvatarImage
                  src={
                    aiAvatarFile
                      ? URL.createObjectURL(aiAvatarFile)
                      : user?.ai_avatar
                        ? pb.files.getURL(user, user.ai_avatar)
                        : 'https://img.usecurling.com/ppl/medium?gender=female&seed=22'
                  }
                />
                <AvatarFallback className="text-xl font-semibold bg-primary/5 text-primary">
                  {aiName ? aiName.charAt(0).toUpperCase() : 'IA'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1.5 w-full max-w-sm">
                <Label htmlFor="ai-avatar-upload" className="text-sm font-semibold text-secondary">
                  Avatar da IA
                </Label>
                <Input
                  id="ai-avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setAiAvatarFile(e.target.files?.[0] || null)}
                  className="text-xs cursor-pointer bg-muted/30"
                />
                <p className="text-xs text-muted-foreground">
                  Imagem recomendada: 256x256px (JPG, PNG).
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="ai-name" className="text-sm font-semibold text-secondary">
                  Nome da IA <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ai-name"
                  value={aiName}
                  onChange={(e) => setAiName(e.target.value)}
                  placeholder="Ex: Bia"
                  className="bg-muted/30"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="ai-voice" className="text-sm font-semibold text-secondary">
                  ID da Voz (ElevenLabs, etc)
                </Label>
                <Input
                  id="ai-voice"
                  value={aiVoiceId}
                  onChange={(e) => setAiVoiceId(e.target.value)}
                  placeholder="Ex: pNInz6obpgDQGcFmaJcg"
                  className="bg-muted/30"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t mt-4">
              <Button onClick={handleSaveAI} disabled={isSavingAI} className="gap-2">
                {isSavingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSavingAI ? 'Salvando...' : 'Salvar Identidade'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Personality */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-indigo-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <FileText className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Personalidade e Comportamento</CardTitle>
                <CardDescription>
                  Defina o prompt do sistema que guiará as respostas da IA.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="system-prompt" className="text-sm font-semibold text-secondary">
                  Prompt do Sistema <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {prompt.length.toLocaleString('pt-BR')} / 100.000
                </span>
              </div>
              <Textarea
                id="system-prompt"
                placeholder="Ex: Você é um atendente..."
                className="min-h-[250px] resize-y bg-card border-muted-foreground/20 font-mono text-sm shadow-inner focus-visible:ring-indigo-500"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={100000}
              />
              <div className="bg-indigo-500/5 rounded-lg p-3 flex items-start gap-2 border border-indigo-500/10">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-indigo-600 font-semibold">Dica:</strong> Especifique o tom
                  de voz, o idioma padrão, restrições de assunto e como a IA deve lidar com
                  situações que não sabe responder.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <Button
                onClick={handleSaveAI}
                disabled={isSavingAI}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSavingAI ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSavingAI ? 'Salvando...' : 'Salvar Comportamento'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Meta Event Manager */}
        <Card
          className={cn(
            'border-border shadow-elevation transition-colors duration-300',
            metaTokenStatus === 'Permissões Insuficientes' &&
              'border-red-500/50 ring-1 ring-red-500/20',
          )}
        >
          <div
            className={cn(
              'h-1 w-full transition-colors duration-300',
              metaTokenStatus === 'Permissões Insuficientes' ? 'bg-red-500' : 'bg-blue-600',
            )}
          ></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 rounded-xl">
                <Facebook className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração Meta Ads</CardTitle>
                <CardDescription>
                  Configure o Pixel para rastreamento de eventos e remarketing.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Pixel Configuration */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="meta-pixel-id" className="font-semibold text-secondary">
                    Meta Pixel ID
                  </Label>
                  <Badge
                    variant={isPixelConfigured ? 'default' : 'secondary'}
                    className="h-5 text-[10px] px-2 font-medium"
                  >
                    {isPixelConfigured ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <Input
                  id="meta-pixel-id"
                  placeholder="Ex: 1522162279584545 (Padrão)"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                  className={cn(
                    'bg-muted/30 focus-visible:ring-blue-600',
                    metaPixelId.length > 0 &&
                      !/^\d+$/.test(metaPixelId) &&
                      'border-red-500 focus-visible:ring-red-500',
                  )}
                  inputMode="numeric"
                />
                {metaPixelId.length > 0 && !/^\d+$/.test(metaPixelId) && (
                  <p className="text-xs text-red-500">
                    O Pixel ID deve conter apenas números sem espaços.
                  </p>
                )}
                {metaPixelId.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Se vazio, o sistema utilizará o ID padrão:{' '}
                    <span className="font-mono text-foreground">1522162279584545</span>
                  </p>
                )}
              </div>

              {/* Test Event Code Configuration */}
              <div className="space-y-3">
                <Label
                  htmlFor="meta-test-code"
                  className="font-semibold text-secondary flex items-center h-[26px]"
                >
                  Código de Teste de Evento (opcional)
                </Label>
                <Input
                  id="meta-test-code"
                  placeholder="Ex: TEST12345"
                  value={metaTestEventCode}
                  onChange={(e) => setMetaTestEventCode(e.target.value.replace(/\s+/g, ''))}
                  className="bg-muted/30 focus-visible:ring-blue-600"
                />
              </div>

              {/* CAPI Token Configuration */}
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="meta-capi-token" className="font-semibold text-secondary">
                  Token da API de Conversões (CAPI)
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="meta-capi-token"
                    type="password"
                    placeholder="EAAB..."
                    value={metaCapiToken}
                    onChange={(e) => setMetaCapiToken(e.target.value.trim())}
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-blue-600"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Necessário para sincronização de Remarketing via Meta CAPI.
                </p>
              </div>

              <div className="flex justify-end mt-2 md:col-span-2 items-center">
                <div className="mr-auto mt-1 flex flex-col items-start gap-1">
                  <Badge
                    variant="outline"
                    className={cn('h-5 text-[10px] px-2 font-medium', connectionBadgeColor)}
                    title={
                      lastErrorMsg ||
                      (metaTokenStatus === 'invalid'
                        ? 'Erro de validação do token/Pixel. Teste novamente para ver detalhes.'
                        : '')
                    }
                  >
                    {connectionBadgeText}
                  </Badge>
                  {metaTokenStatus === 'invalid' && lastErrorMsg && (
                    <span
                      className="text-[10px] text-destructive max-w-xs truncate"
                      title={lastErrorMsg}
                    >
                      {lastErrorMsg}
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testMetaConnection}
                  disabled={isTestingConnection || !user?.meta_pixel_id || !user?.meta_capi_token}
                  className="gap-2"
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  )}
                  Testar Conexão do Pixel
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="font-semibold text-secondary">
                Tags Multi-Pixel ({metaTagsList.length})
              </Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Nome (Ex: BRF 4)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="bg-muted/30"
                />
                <Input
                  placeholder="ID (Ex: 123456789)"
                  value={newTagId}
                  onChange={(e) => setNewTagId(e.target.value)}
                  className="bg-muted/30"
                  inputMode="numeric"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newTagName && newTagId) {
                      if (!/^\d+$/.test(newTagId.trim())) {
                        toast({
                          title: 'Tag ID Inválido',
                          description: 'O ID da tag deve conter apenas números.',
                          variant: 'destructive',
                        })
                        return
                      }
                      setMetaTagsList([...metaTagsList, { name: newTagName, id: newTagId.trim() }])
                      setNewTagName('')
                      setNewTagId('')
                    }
                  }}
                  type="button"
                >
                  Adicionar
                </Button>
              </div>
              {metaTagsList.length > 0 && (
                <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2">
                  {metaTagsList.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 text-sm border rounded-md bg-muted/20"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 overflow-hidden">
                        <span className="font-medium truncate max-w-[200px]">{tag.name}</span>
                        <span className="text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded text-xs w-fit">
                          {tag.id}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10 h-8 px-2"
                        onClick={() => setMetaTagsList(metaTagsList.filter((_, i) => i !== index))}
                        type="button"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Estas tags são inicializadas automaticamente em todas as páginas para rastreamento
                simultâneo.
              </p>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-secondary">
                  Telefone de Campanha Ativa (Ingestão de Leads)
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 gap-1.5',
                    metaCampaignPhone
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      metaCampaignPhone ? 'bg-green-500 animate-pulse' : 'bg-amber-500',
                    )}
                  />
                  {metaCampaignPhone ? 'Online' : 'Não Configurado'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Configure o número principal que está recebendo os leads das campanhas do Meta Ads.
                O Webhook irá identificar as mensagens e criar novos contatos no CRM
                automaticamente.
              </p>
              <div className="space-y-3">
                <Label htmlFor="meta-campaign-phone" className="font-semibold text-secondary">
                  Telefone da Campanha (WhatsApp)
                </Label>
                <Input
                  id="meta-campaign-phone"
                  placeholder="Ex: 5511999999999"
                  value={metaCampaignPhone}
                  onChange={(e) => setMetaCampaignPhone(e.target.value.replace(/\D/g, ''))}
                  className={cn(
                    'bg-muted/30 focus-visible:ring-blue-600',
                    !metaCampaignPhone && 'border-amber-500/50',
                  )}
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  O sistema verificará este número ao receber o payload do Meta e registrará novos
                  leads automaticamente em seu painel.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t mt-4">
              <Button
                onClick={handleSaveMeta}
                disabled={isSavingMeta}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isSavingMeta ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Salvar Configurações do Meta
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Google Tag Manager (GTM) Status Widget */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-green-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Google Tag Manager</CardTitle>
                <CardDescription>Status de integração do container global GTM.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-muted/20 gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-secondary flex items-center gap-2">
                  Container ID:{' '}
                  <span className="font-mono bg-background px-2 py-0.5 rounded border text-sm">
                    GTM-MWML5KFQ
                  </span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Monitoramento de eventos e tracking do sistema.
                </p>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'h-7 px-3 text-xs font-semibold whitespace-nowrap shrink-0',
                  gtmStatusColor,
                )}
              >
                {gtmStatusText}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <DiagnosticCenter />

        {/* Integrations & API */}
        <Card className="border-border shadow-elevation">
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração e Chaves de API</CardTitle>
                <CardDescription>
                  Configure as chaves de acesso do Uazapi e do provedor de inteligência.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="uazapi-token" className="font-semibold text-secondary">
                  Uazapi Token
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="uazapi-token"
                    type="password"
                    placeholder="••••••••••••••••"
                    defaultValue="token_simulation_123"
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="openai-key" className="font-semibold text-secondary">
                  OpenAI API Key
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-••••••••••••••••"
                    defaultValue="sk-simulation_456"
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cadence AI Rules Editor Dialog */}
      <Dialog
        open={!!editingCadence}
        onOpenChange={(open) => {
          if (!open) setEditingCadence(null)
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Regras IA: {editingCadence?.title}</DialogTitle>
            <DialogDescription>
              Defina as instruções exclusivas que a IA usará ao interagir com leads nesta fase da
              cadência. O conteúdo e status não serão alterados.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="cadence-ai-rules" className="text-sm font-semibold text-secondary">
                Regras e Instruções da IA
              </Label>
              <span className="text-xs text-muted-foreground font-mono">
                {editAiInstructions.length.toLocaleString('pt-BR')} / 100.000
              </span>
            </div>
            <Textarea
              id="cadence-ai-rules"
              placeholder="Descreva como a IA deve se comportar nesta cadência..."
              value={editAiInstructions}
              onChange={(e) => setEditAiInstructions(e.target.value)}
              className="min-h-[200px] resize-y"
              maxLength={100000}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCadence(null)}
              disabled={isSavingCadence}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCadenceInstructions} disabled={isSavingCadence}>
              {isSavingCadence ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Regras'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border flex justify-end md:pl-[var(--sidebar-width)] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-4xl w-full mx-auto flex justify-end items-center gap-4 px-4 md:px-0">
          {isDirty && (
            <span className="text-sm text-amber-500 font-medium hidden sm:inline-block">
              Alterações não salvas
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="shadow-md px-8 h-11 hover:scale-105 transition-transform"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <Save className="h-5 w-5" />
                Salvar Alterações
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
