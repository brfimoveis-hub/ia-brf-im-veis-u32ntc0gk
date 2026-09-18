import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getMetaAdsOverview,
  createMetaAdsCampaign,
  getMetaAdsCreatives,
  type MetaAdsOverviewResponse,
  type MetaAdCampaign,
  type WhatsAppApprovedTemplate,
} from '@/services/meta_ads'
import { getInstagramOAuthUrl, getInstagramRedirectUri } from '@/services/instagram'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Megaphone,
  MousePointerClick,
  HelpCircle,
  Info,
  CheckCircle2,
  Lock,
  Layers,
  ArrowRight,
  Flame,
} from 'lucide-react'

export default function Anuncios() {
  const { user } = useAuth()

  const [data, setData] = useState<MetaAdsOverviewResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Lista de templates de WhatsApp
  const [templates, setTemplates] = useState<WhatsAppApprovedTemplate[]>([])
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('')

  // Modal de Criação de Anúncio
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Formulário de Criação
  const [name, setName] = useState('')
  const [primaryText, setPrimaryText] = useState('')
  const [headline, setHeadline] = useState('Fale com a Bia no WhatsApp')
  const [description, setDescription] = useState('Atendimento instantâneo e opções exclusivas')
  const [imageUrl, setImageUrl] = useState('')
  const [dailyBudget, setDailyBudget] = useState('20')
  const [city, setCity] = useState('Governador Celso Ramos e Florianópolis')
  const [minAge, setMinAge] = useState('25')
  const [maxAge, setMaxAge] = useState('65')

  // Cálculos de Projeção
  const dailyBudgetNum = parseFloat(dailyBudget.replace(',', '.')) || 0
  const monthlyProjection = useMemo(() => {
    return dailyBudgetNum * 30
  }, [dailyBudgetNum])

  // Identificação do App Meta para autorização
  const activeAppId = (
    user?.meta_instagram_app_id ||
    user?.meta_app_id ||
    '2442476629610638'
  ).trim()
  const redirectUri = useMemo(() => getInstagramRedirectUri(), [])

  // Carregar visão geral dos anúncios
  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [overviewRes, creativesRes] = await Promise.allSettled([
        getMetaAdsOverview(),
        getMetaAdsCreatives(),
      ])

      if (overviewRes.status === 'fulfilled') {
        setData(overviewRes.value)
      } else {
        toast({
          title: 'Erro ao conectar à Meta',
          description: 'Não foi possível carregar os dados de anúncios.',
          variant: 'destructive',
        })
      }

      if (creativesRes.status === 'fulfilled' && creativesRes.value.success) {
        setTemplates(creativesRes.value.templates || [])
        if (creativesRes.value.default_template) {
          setSelectedTemplateName(creativesRes.value.default_template.name)
        }
      }
    } catch (err: any) {
      toast({
        title: 'Erro inesperado',
        description: err?.message || 'Falha ao buscar dados do módulo de anúncios.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOverview()
  }, [loadOverview])

  // Preencher texto com base no template selecionado
  const handleSelectTemplate = (templateName: string) => {
    setSelectedTemplateName(templateName)
    const tmpl = templates.find((t) => t.name === templateName)
    if (tmpl && tmpl.body_text) {
      setPrimaryText(tmpl.body_text)
    }
  }

  // Ação de autorizar / reautorizar com escopos de anúncios
  const handleConnectOAuthWithAds = () => {
    if (!activeAppId) {
      toast({
        title: 'App Meta não configurado',
        description: 'Configure o Meta App ID nas Conexões antes de autorizar.',
        variant: 'destructive',
      })
      return
    }
    const oauthUrl = getInstagramOAuthUrl(activeAppId, redirectUri, undefined, true)
    window.location.href = oauthUrl
  }

  // Ação de submeter nova campanha
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do anúncio.',
        variant: 'destructive',
      })
      return
    }
    if (!primaryText.trim()) {
      toast({
        title: 'Texto obrigatório',
        description: 'Informe o texto principal do anúncio.',
        variant: 'destructive',
      })
      return
    }
    if (dailyBudgetNum < 10) {
      toast({
        title: 'Orçamento muito baixo',
        description: 'O orçamento mínimo diário é R$ 10,00.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      const res = await createMetaAdsCampaign({
        name,
        primary_text: primaryText,
        headline,
        description,
        image_url: imageUrl,
        daily_budget: dailyBudgetNum,
        city,
        min_age: parseInt(minAge, 10) || 25,
        max_age: parseInt(maxAge, 10) || 65,
      })

      if (res.success) {
        toast({
          title: 'Anúncio criado com sucesso! 🎉',
          description: res.message || 'Campanha criada em modo pausado para revisão.',
        })
        setIsCreateOpen(false)
        // Reset form
        setName('')
        setPrimaryText('')
        setImageUrl('')
        await loadOverview(true)
      } else if (res.needs_ads_permission) {
        toast({
          title: 'Permissão necessária',
          description: 'A Meta exige uma autorização extra (ads_management) para criar anúncios.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Erro na criação do anúncio',
          description: res.message || 'Verifique os dados e tente novamente.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Falha ao publicar',
        description: err?.message || 'Erro de comunicação ao publicar o anúncio na Meta.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const summary = data?.summary
  const campaigns = data?.campaigns || []
  const adAccount = data?.ad_account
  const needsPermission = data?.needs_ads_permission

  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
              Anúncios Meta (Meta Ads)
            </h1>
            <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
              Click-to-WhatsApp
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Criação e acompanhamento de anúncios diretos para o WhatsApp da BRF Imóveis com
            atendimento da Bia.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadOverview(true)}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Atualizando...' : 'Atualizar'}
          </Button>

          {!needsPermission && (
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                  <PlusCircle className="h-4 w-4" />
                  Criar Anúncio Click-to-WhatsApp
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-indigo-600" />
                    Criar Anúncio Click-to-WhatsApp
                  </DialogTitle>
                  <DialogDescription>
                    Publica uma campanha na conta da BRF Imóveis apontando diretamente para o
                    WhatsApp oficial com a Bia.
                  </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleCreateCampaign} className="space-y-4 pt-2">
                  {/* Dica da janela de 72h */}
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-semibold">Vantagem de Custo Meta:</strong> Cada lead
                      vindo deste anúncio gera uma{' '}
                      <strong>janela de 72 horas de conversa 100% gratuita com a Bia</strong> (sem
                      gastar a cota de serviço)!
                    </div>
                  </div>

                  {/* Template aprovado opcional */}
                  {templates.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold flex items-center justify-between">
                        <span>Reutilizar Template Aprovado (Opcional):</span>
                        <span className="text-[11px] text-muted-foreground">
                          Ex: villa_dos_acores
                        </span>
                      </Label>
                      <Select value={selectedTemplateName} onValueChange={handleSelectTemplate}>
                        <SelectTrigger className="text-xs">
                          <SelectValue placeholder="Selecione um template aprovado" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.name} className="text-xs">
                              {t.name} ({t.category})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Nome da Campanha */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Nome da Campanha / Anúncio *</Label>
                    <Input
                      placeholder="Ex: Villa dos Açores - Lançamento Frente Mar"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="text-xs"
                    />
                  </div>

                  {/* Texto Primário com Contador */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Texto Principal do Anúncio *</Label>
                      <span className="text-[11px] text-muted-foreground">
                        {primaryText.length} caracteres
                      </span>
                    </div>
                    <Textarea
                      placeholder="Ex: Descubra o Villa dos Açores! Apartamentos exclusivos com alto padrão na praia. Toque no botão abaixo e fale direto com a nossa equipe no WhatsApp para receber a tabela."
                      value={primaryText}
                      onChange={(e) => setPrimaryText(e.target.value)}
                      rows={4}
                      required
                      className="text-xs leading-relaxed"
                    />
                  </div>

                  {/* Headline e Descrição */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Título do Botão (Headline)</Label>
                      <Input
                        placeholder="Ex: Fale com a Bia no WhatsApp"
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Descrição Complementar</Label>
                      <Input
                        placeholder="Ex: Atendimento instantâneo"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* Imagem do Anúncio */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">
                      URL da Imagem Criativa (opcional)
                    </Label>
                    <Input
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Insira o link direto de uma foto de empreendimento da BRF Imóveis ou deixe
                      vazio para usar a foto padrão da Página.
                    </p>
                  </div>

                  {/* Orçamento e Segmentação */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Orçamento Diário (R$) *</Label>
                      <Input
                        type="number"
                        min="10"
                        step="1"
                        value={dailyBudget}
                        onChange={(e) => setDailyBudget(e.target.value)}
                        className="text-xs font-bold"
                      />
                      <span className="text-[10px] text-muted-foreground">Sugestão: R$ 20/dia</span>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Região / Cidade</Label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="text-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Faixa Etária (anos)</Label>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={minAge}
                          onChange={(e) => setMinAge(e.target.value)}
                          className="text-xs w-16"
                        />
                        <span className="text-xs text-muted-foreground">a</span>
                        <Input
                          type="number"
                          value={maxAge}
                          onChange={(e) => setMaxAge(e.target.value)}
                          className="text-xs w-16"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Resumo do Custo Projetado */}
                  <div className="rounded-lg bg-slate-900 text-slate-100 p-4 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                      <span>Orçamento Diário Selecionado:</span>
                      <span className="text-white font-bold">
                        R$ {dailyBudgetNum.toFixed(2)} / dia
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold border-t border-slate-800 pt-2 text-white">
                      <span>Custo Projetado Mensal (30 dias):</span>
                      <span className="text-emerald-400 text-base font-bold">
                        R$ {monthlyProjection.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      A campanha é criada em modo <strong>Pausado</strong> no Meta Ads. O valor só
                      começa a ser consumido quando você aprovar e ativar o anúncio.
                    </p>
                  </div>

                  <DialogFooter className="pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={submitting}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={submitting}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Publicando na Meta...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Publicar Anúncio no Meta Ads
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Dica visível da Regra de Ouro (72h grátis com a Bia) */}
      <Alert className="border-indigo-200 bg-gradient-to-r from-indigo-50/70 to-blue-50/70 text-indigo-950">
        <Flame className="h-5 w-5 text-indigo-600 shrink-0" />
        <div className="ml-2">
          <AlertTitle className="text-sm font-semibold text-indigo-900 flex items-center gap-2">
            Lead de Anúncio = Conversa Grátis com a Bia por 72 horas!
            <Badge className="bg-indigo-600 text-white text-[10px]">Estratégia Ouro</Badge>
          </AlertTitle>
          <AlertDescription className="text-xs text-indigo-900/90 mt-1 leading-relaxed">
            Pela política oficial da Meta, qualquer contato que clica no seu anúncio do
            Facebook/Instagram e envia mensagem para o WhatsApp entra em uma{' '}
            <strong>janela de 72 horas 100% gratuita</strong>. Todas as mensagens enviadas pela Bia
            e pelos corretores para esse lead não são cobradas, gerando máxima economia!
          </AlertDescription>
        </div>
      </Alert>

      {/* ESTADO A: SEM PERMISSÃO DE ANÚNCIOS OU TOKEN EXPIRADO */}
      {needsPermission && (
        <Card className="border-amber-300 bg-amber-50/40 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-amber-500/10 text-amber-700 shrink-0 mt-0.5">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg text-amber-950">
                  Autorização de Anúncios Necessária (1 Clique)
                </CardTitle>
                <CardDescription className="text-xs text-amber-800/90 mt-0.5">
                  Sua conta Meta já está conectada para o Instagram e WhatsApp, mas a Meta exige uma
                  permissão extra específica para criação e leitura de anúncios (Meta Ads).
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-0">
            <div className="rounded-lg bg-background border border-amber-200/80 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                <Info className="h-4 w-4 text-amber-600" />
                <span>Por que os anúncios precisam dessa autorização extra?</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Por motivos de segurança e privacidade bancária, o Facebook separa os acessos de
                publicação de posts dos acessos ao Gerenciador de Anúncios (orçamento e campanhas).
                A sua conta de anúncios cadastrada{' '}
                <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px] text-foreground">
                  ID: 1487400719850387
                </code>{' '}
                está ativa e com pontuação 100, aguardando apenas o consentimento do proprietário.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleConnectOAuthWithAds}
                  className="gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Autorizar Gerenciador de Anúncios na Meta
                </Button>
                <Button
                  variant="outline"
                  size="default"
                  onClick={() => loadOverview(true)}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Verificar Novamente
                </Button>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              Nota: Essa autorização não altera em nada o funcionamento da Bia, nem as conexões já
              ativas do seu WhatsApp ou Instagram.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ESTADO B: DASHBOARD COM PERMISSÃO (OU VISÃO RESUMO) */}
      {/* Cards de Métricas (30 dias) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Investimento Total (30d)</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              R$ {summary ? summary.total_spend_brl.toFixed(2) : '0,00'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Conta: act_1487400719850387</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Resultados / Conversas</span>
              <Users className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              {summary ? summary.total_results : 0}
            </div>
            <p className="text-[11px] text-emerald-600 font-medium mt-1">
              Contatos no WhatsApp via anúncio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Custo por Resultado (CPA)</span>
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              R$ {summary ? summary.cpa_brl.toFixed(2) : '0,00'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Por lead qualificado iniciado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Cliques & Alcance</span>
              <MousePointerClick className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-slate-900">
              {summary ? summary.total_clicks.toLocaleString('pt-BR') : 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Alcance: {summary ? summary.total_reach.toLocaleString('pt-BR') : 0} pessoas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Campanhas Meta Ads */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                Campanhas Ativas & Histórico no Meta Ads
              </CardTitle>
              <CardDescription className="text-xs">
                Métricas sincronizadas diretamente da Marketing API da Meta nos últimos 30 dias.
              </CardDescription>
            </div>
            {adAccount && (
              <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 w-fit">
                Pontuação da Conta: {adAccount.score}/100
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Orçamento Diário</TableHead>
                  <TableHead>Investimento (30d)</TableHead>
                  <TableHead>Resultados (Leads)</TableHead>
                  <TableHead>Custo por Lead</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-sm text-muted-foreground"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                          <span>Carregando campanhas do Meta Ads...</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p>Nenhuma campanha encontrada nos últimos 30 dias na conta.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateOpen(true)}
                            className="gap-2 text-xs"
                          >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Criar Primeiro Anúncio Click-to-WhatsApp
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((camp) => (
                    <TableRow key={camp.id}>
                      <TableCell className="font-medium text-xs">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-slate-900">{camp.name}</span>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            ID: {camp.id} • {camp.objective}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            camp.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : camp.status === 'PAUSED'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600'
                          }
                        >
                          {camp.status === 'ACTIVE'
                            ? 'Ativa'
                            : camp.status === 'PAUSED'
                              ? 'Pausada'
                              : camp.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {camp.daily_budget_brl > 0
                          ? `R$ ${camp.daily_budget_brl.toFixed(2)}/dia`
                          : '—'}
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        R$ {camp.spend_brl.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-bold text-slate-900">{camp.results}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({camp.clicks} cliques)
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-900">
                        {camp.results > 0 ? `R$ ${camp.cost_per_result_brl.toFixed(2)}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Informações Técnicas da Conta e Ativos Vinculados */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Conta de Anúncios Meta
          </div>
          <div className="text-sm font-bold text-slate-900">
            {adAccount?.name || 'BRF Imóveis - Anúncios'}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            ID: 1487400719850387 (Moeda: BRL)
          </div>
        </Card>

        <Card className="p-4 space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Página do Facebook Oficial
          </div>
          <div className="text-sm font-bold text-slate-900">BRF Imóveis</div>
          <div className="text-xs text-muted-foreground font-mono">
            ID: 1343797128806374 (Vinculada ao Instagram @mauro.brfimoveis)
          </div>
        </Card>

        <Card className="p-4 space-y-1.5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Destino Click-to-WhatsApp
          </div>
          <div className="text-sm font-bold text-emerald-700">+55 48 9209-8050</div>
          <div className="text-xs text-muted-foreground">
            WhatsApp Business verificado com atendimento da Bia
          </div>
        </Card>
      </div>
    </div>
  )
}
