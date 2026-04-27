import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Copy,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useBlocker } from 'react-router-dom'
import { useRealtime } from '@/hooks/use-realtime'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'

export default function Settings() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingMeta, setIsSavingMeta] = useState(false)

  const [prompt, setPrompt] = useState(
    'Você é um assistente virtual de vendas especializado em produtos SaaS. Seja sempre educado, objetivo e utilize emojis ocasionalmente.',
  )

  // Meta Ads State
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [metaTestEventCode, setMetaTestEventCode] = useState('')
  const [metaTagsList, setMetaTagsList] = useState<{ id: string; name: string }[]>([])
  const [metaCampaignPhone, setMetaCampaignPhone] = useState('')

  // UI State
  const [newTagName, setNewTagName] = useState('')
  const [newTagId, setNewTagId] = useState('')
  const [showCapiToken, setShowCapiToken] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  const [initialMeta, setInitialMeta] = useState({
    pixel: '',
    capi: '',
    test: '',
    tags: '[]',
    prompt: '',
    campaignPhone: '',
  })
  const [isInitialized, setIsInitialized] = useState(false)

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
    if (user && !isInitialized) {
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setMetaTestEventCode(user.meta_test_event_code || '')
      setMetaCampaignPhone(user.meta_campaign_phone || '')
      setMetaTagsList(user.meta_tags_list || [])
      if (user.ai_instructions) setPrompt(user.ai_instructions)

      setInitialMeta({
        pixel: user.meta_pixel_id || '',
        capi: user.meta_capi_token || '',
        test: user.meta_test_event_code || '',
        tags: JSON.stringify(user.meta_tags_list || []),
        prompt: user.ai_instructions || '',
        campaignPhone: user.meta_campaign_phone || '',
      })
      setIsInitialized(true)
    }
  }, [user, isInitialized])

  const isDirty =
    metaPixelId !== initialMeta.pixel ||
    metaCapiToken !== initialMeta.capi ||
    metaTestEventCode !== initialMeta.test ||
    metaCampaignPhone !== initialMeta.campaignPhone ||
    JSON.stringify(metaTagsList) !== initialMeta.tags ||
    prompt !== initialMeta.prompt

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
    const cleanCapiToken = metaCapiToken
      .replace(/^Bearer\s+/i, '')
      .replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
      .replace(/^(EA)+/i, 'EA')
      .trim()
    const cleanTestCode = metaTestEventCode.trim()
    const cleanCampaignPhone = metaCampaignPhone.trim()
    return { cleanPixelId, cleanCapiToken, cleanTestCode, cleanCampaignPhone }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      if (!user?.id) throw new Error('Usuário não autenticado')
      const { cleanPixelId, cleanCapiToken, cleanTestCode, cleanCampaignPhone } = getCleanMeta()

      const updateData: any = {
        meta_pixel_id: cleanPixelId,
        meta_capi_token: cleanCapiToken,
        meta_test_event_code: cleanTestCode,
        meta_campaign_phone: cleanCampaignPhone,
        meta_tags_list: metaTagsList,
      }

      if (prompt && prompt.trim() !== '') {
        updateData.ai_instructions = prompt
      }

      if (cleanPixelId !== initialMeta.pixel || cleanCapiToken !== initialMeta.capi) {
        updateData.meta_token_status = 'untested'
        updateData.meta_last_validated = ''
      }

      const updatedUser = await pb.collection('users').update(user.id, updateData)
      await pb.collection('users').authRefresh()

      setInitialMeta({
        pixel: updatedUser.meta_pixel_id || '',
        capi: updatedUser.meta_capi_token || '',
        test: updatedUser.meta_test_event_code || '',
        tags: JSON.stringify(updatedUser.meta_tags_list || []),
        prompt: updatedUser.ai_instructions || '',
        campaignPhone: updatedUser.meta_campaign_phone || '',
      })

      setMetaPixelId(cleanPixelId)
      setMetaCapiToken(cleanCapiToken)
      setMetaTestEventCode(cleanTestCode)
      setMetaCampaignPhone(cleanCampaignPhone)

      setTimeout(() => {
        setIsSaving(false)
        toast({
          title: 'Configurações salvas!',
          description: 'As alterações foram aplicadas com sucesso.',
        })
      }, 500)
    } catch (error) {
      setIsSaving(false)
      toast({
        title: 'Erro ao salvar',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveMeta = async () => {
    setIsSavingMeta(true)
    try {
      if (!user?.id) throw new Error('Usuário não autenticado')
      const { cleanPixelId, cleanCapiToken, cleanTestCode, cleanCampaignPhone } = getCleanMeta()

      const updateData: any = {
        meta_pixel_id: cleanPixelId,
        meta_capi_token: cleanCapiToken,
        meta_test_event_code: cleanTestCode,
        meta_campaign_phone: cleanCampaignPhone,
        meta_tags_list: metaTagsList,
        // Partial Update: DO NOT INCLUDE ai_instructions here to prevent overwriting
      }

      if (cleanPixelId !== initialMeta.pixel || cleanCapiToken !== initialMeta.capi) {
        updateData.meta_token_status = 'untested'
        updateData.meta_last_validated = ''
      }

      const updatedUser = await pb.collection('users').update(user.id, updateData)
      await pb.collection('users').authRefresh()

      setInitialMeta((prev) => ({
        ...prev,
        pixel: updatedUser.meta_pixel_id || '',
        capi: updatedUser.meta_capi_token || '',
        test: updatedUser.meta_test_event_code || '',
        campaignPhone: updatedUser.meta_campaign_phone || '',
        tags: JSON.stringify(updatedUser.meta_tags_list || []),
      }))

      setMetaPixelId(cleanPixelId)
      setMetaCapiToken(cleanCapiToken)
      setMetaTestEventCode(cleanTestCode)
      setMetaCampaignPhone(cleanCampaignPhone)

      toast({
        title: 'Configurações do Meta salvas!',
        description: 'As alterações foram aplicadas com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingMeta(false)
    }
  }

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText('https://ia-uazapi-6d79e.goskip.app/backend/v1/meta-webhook')
    toast({
      title: 'URL Copiada',
      description: 'A URL do Webhook foi copiada para a área de transferência.',
    })
  }

  const testMetaConnection = async () => {
    const { cleanPixelId, cleanCapiToken } = getCleanMeta()

    if (!cleanPixelId || !cleanCapiToken) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o Pixel ID e o Token CAPI antes de testar.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingConnection(true)
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
      toast({
        title: 'Conexão bem-sucedida',
        description:
          'O Pixel ID (Browser) e o Token (Server-to-Server CAPI) foram validados com sucesso e estão comunicando com o Meta.',
      })
    } catch (error: any) {
      await pb.collection('users').authRefresh()
      let errorMsg = 'Verifique as credenciais.'

      const resData = error.response?.data
      if (resData?.message && typeof resData.message === 'string') {
        errorMsg = resData.message
      } else if (resData?.error?.error?.message) {
        errorMsg = resData.error.error.message
      } else if (resData?.error?.message) {
        errorMsg = resData.error.message
      } else if (resData?.error && typeof resData.error === 'string') {
        errorMsg = resData.error
      } else if (
        error.response?.message &&
        error.response?.message !== 'Something went wrong while processing your request.'
      ) {
        errorMsg = error.response.message
      } else if (error.message) {
        errorMsg = error.message
      }

      if (typeof errorMsg === 'object') {
        errorMsg = JSON.stringify(errorMsg)
      }

      toast({
        title: 'Erro de Conexão',
        description: `Falha ao validar com o Meta: ${errorMsg}. Verifique espaços em branco no seu token e tente novamente.`,
        variant: 'destructive',
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  // Status Logic variables
  const isPixelConfigured = metaPixelId.trim().length > 0
  const isCapiConfigured = metaCapiToken.trim().length > 0

  const metaTokenStatus = user?.meta_token_status || 'untested'

  let connectionBadgeText = 'Não Testado'
  let connectionBadgeColor = 'bg-muted text-muted-foreground'

  if (metaTokenStatus === 'valid') {
    connectionBadgeText = 'Validado'
    connectionBadgeColor =
      'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border'
  } else if (metaTokenStatus === 'invalid') {
    connectionBadgeText = 'Erro de Conexão'
    connectionBadgeColor =
      'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 border'
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-secondary">Configurações da IA</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerencie o comportamento e o conhecimento do seu agente inteligente.
        </p>
      </div>

      <div className="grid gap-8">
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

        {/* AI Personality */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-primary w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <SettingsIcon className="h-6 w-6 text-primary" />
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
              <Label htmlFor="system-prompt" className="text-sm font-semibold text-secondary">
                Prompt do Sistema
              </Label>
              <Textarea
                id="system-prompt"
                placeholder="Ex: Você é um atendente..."
                className="min-h-[180px] resize-y bg-card border-muted-foreground/20 font-mono text-sm shadow-inner focus-visible:ring-primary"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <div className="bg-primary/5 rounded-lg p-3 flex items-start gap-2 border border-primary/10">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-primary font-semibold">Dica:</strong> Especifique o tom de
                  voz, o idioma padrão, restrições de assunto e como a IA deve lidar com situações
                  que não sabe responder.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meta Event Manager */}
        <Card className="border-border shadow-elevation">
          <div className="h-1 bg-blue-600 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 rounded-xl">
                <Facebook className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração Meta Ads</CardTitle>
                <CardDescription>
                  Configure o Pixel e a API de Conversões para rastreamento de eventos e
                  remarketing.
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
                  placeholder="Ex: 1632697264651953 (Padrão)"
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
                    <span className="font-mono text-foreground">1632697264651953</span>
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
            </div>

            {/* CAPI Configuration */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="meta-capi-token" className="font-semibold text-secondary">
                  Token de Acesso CAPI
                </Label>
                <Badge
                  variant="outline"
                  className={cn('h-5 text-[10px] px-2 font-medium', connectionBadgeColor)}
                >
                  {connectionBadgeText}
                </Badge>
              </div>
              <div className="relative">
                <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="meta-capi-token"
                  type={showCapiToken ? 'text' : 'password'}
                  placeholder="Insira seu token de acesso permanente"
                  value={metaCapiToken}
                  onChange={(e) =>
                    setMetaCapiToken(
                      e.target.value.replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, ''),
                    )
                  }
                  className={cn(
                    'pl-10 pr-10 h-11 bg-muted/30 focus-visible:ring-blue-600 font-mono text-sm',
                    metaCapiToken.length > 0 &&
                      metaCapiToken.length < 20 &&
                      'border-red-500 focus-visible:ring-red-500',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowCapiToken(!showCapiToken)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showCapiToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {metaCapiToken.length > 0 && metaCapiToken.length < 20 && (
                <p className="text-xs text-red-500 mt-1">
                  O token parece curto demais para ser válido.
                </p>
              )}
              <div className="flex justify-end mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testMetaConnection}
                  disabled={isTestingConnection}
                  className="gap-2"
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  )}
                  Testar Conexão com Meta
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
              <h3 className="text-lg font-medium text-secondary">
                Safeguards de Remarketing (Anti-Ban)
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Proteja seu número principal utilizando um número secundário exclusivo para eventos
                de remarketing e controle as integrações.
              </p>
              <div className="space-y-3">
                <Label htmlFor="meta-campaign-phone" className="font-semibold text-secondary">
                  Telefone de Campanha (WhatsApp Secundário)
                </Label>
                <Input
                  id="meta-campaign-phone"
                  placeholder="Ex: 5511999999999"
                  value={metaCampaignPhone}
                  onChange={(e) => setMetaCampaignPhone(e.target.value.replace(/\D/g, ''))}
                  className="bg-muted/30 focus-visible:ring-blue-600"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">
                  Se preenchido, este número será associado aos eventos enviados para o Meta como o
                  remetente da campanha.
                </p>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <Label className="font-semibold text-secondary">
                URL do Webhook (API de Conversões)
              </Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value="https://ia-uazapi-6d79e.goskip.app/backend/v1/meta-webhook"
                  className="bg-muted/50 text-muted-foreground font-mono text-sm"
                />
                <Button variant="secondary" onClick={copyWebhookUrl} className="shrink-0 gap-2">
                  <Copy className="h-4 w-4" /> Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Copie e cole esta URL no Gerenciador de Eventos do Meta para envios server-side.
              </p>
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

        {/* Diagnostic Center */}
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
                Aplicando...
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
