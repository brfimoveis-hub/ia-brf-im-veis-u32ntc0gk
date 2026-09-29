import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  scanMetaAssets,
  updateAssetCleanupStatus,
  type MetaAsset,
  type CleanupSummary,
  type AssetStatus,
  type AssetType,
} from '@/services/meta_assets_cleanup'
import {
  getInstagramRedirectUri,
  getInstagramOAuthUrl,
  getInstagramActiveAppId,
} from '@/services/instagram'
import {
  ShieldCheck,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Search,
  Sparkles,
  Info,
  Layers,
  Facebook,
  Instagram,
  Briefcase,
  Megaphone,
  MessageSquare,
  Lock,
  ArrowRight,
  Filter,
} from 'lucide-react'

export default function FaxinaAtivosMeta() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [assets, setAssets] = useState<MetaAsset[]>([])
  const [summary, setSummary] = useState<CleanupSummary>({
    total: 0,
    cleaned: 0,
    kept: 0,
    pending: 0,
    protected: 0,
    cleanable_total: 0,
    cleanable_pending: 0,
    progress_percentage: 0,
  })
  const [tokenDiagnostics, setTokenDiagnostics] = useState<{
    missing_scopes: string[]
    granted_permissions: string[]
    warnings: string[]
    has_business_management: boolean
  }>({
    missing_scopes: [],
    granted_permissions: [],
    warnings: [],
    has_business_management: false,
  })

  // Filtros de busca e tipo
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchAssets = useCallback(
    async (isManualRefresh = false) => {
      if (isManualRefresh) setRefreshing(true)
      else setLoading(true)

      try {
        const res = await scanMetaAssets()
        if (res && res.success) {
          setAssets(res.assets || [])
          setSummary(res.summary)
          setTokenDiagnostics(res.token_diagnostics)

          if (isManualRefresh) {
            toast({
              title: 'Ativos atualizados com sucesso',
              description: `${res.assets.length} ativos varridos via Meta Graph API e CRM.`,
            })
          }
        }
      } catch (err: any) {
        console.error('Erro ao buscar ativos Meta:', err)
        toast({
          variant: 'destructive',
          title: 'Falha ao carregar ativos Meta',
          description:
            err?.message || 'Verifique se você possui token da Meta cadastrado nas conexões.',
        })
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Atualizar status de um ativo
  const handleStatusChange = async (asset: MetaAsset, newStatus: AssetStatus) => {
    if (asset.is_protected && newStatus === 'cleaned') {
      toast({
        variant: 'destructive',
        title: 'Ativo Protegido',
        description: 'Este ativo é estritamente essencial para o CRM e NUNCA pode ser excluído.',
      })
      return
    }

    setUpdatingId(asset.id)
    try {
      await updateAssetCleanupStatus({
        asset_id: asset.id,
        asset_name: asset.name,
        asset_type: asset.type,
        status: newStatus,
        notes: asset.notes,
      })

      // Atualiza estado local imediatamente
      setAssets((prev) =>
        prev.map((item) => (item.id === asset.id ? { ...item, status: newStatus } : item)),
      )

      // Atualiza contadores do resumo
      setSummary((prev) => {
        const oldStatus = asset.status
        if (oldStatus === newStatus) return prev

        const newCleaned =
          newStatus === 'cleaned'
            ? prev.cleaned + 1
            : oldStatus === 'cleaned'
              ? prev.cleaned - 1
              : prev.cleaned
        const newKept =
          newStatus === 'kept' ? prev.kept + 1 : oldStatus === 'kept' ? prev.kept - 1 : prev.kept
        const newPending =
          newStatus === 'pending'
            ? prev.pending + 1
            : oldStatus === 'pending'
              ? prev.pending - 1
              : prev.pending

        const cleanable = prev.cleanable_total
        const progress = cleanable > 0 ? Math.round((newCleaned / cleanable) * 100) : 100

        return {
          ...prev,
          cleaned: newCleaned,
          kept: newKept,
          pending: newPending,
          cleanable_pending: Math.max(0, newPending),
          progress_percentage: progress,
        }
      })

      toast({
        title:
          newStatus === 'cleaned'
            ? 'Marcado como Limpo ✅'
            : newStatus === 'kept'
              ? 'Marcado para Manter 🛡️'
              : 'Status redefinido para Pendente',
        description: `${asset.name} foi atualizado no seu checklist persistente.`,
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar alteração',
        description: err?.message || 'Não foi possível salvar o status no servidor.',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  // Filtragem dos ativos
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // Filtro de texto
      const matchesSearch =
        searchTerm === '' ||
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.username && asset.username.toLowerCase().includes(searchTerm.toLowerCase()))

      // Filtro de tipo
      const matchesType = typeFilter === 'all' || asset.type === typeFilter

      // Filtro de status
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'protected' && asset.is_protected) ||
        (statusFilter === 'duplicate' && asset.is_known_duplicate) ||
        asset.status === statusFilter

      return matchesSearch && matchesType && matchesStatus
    })
  }, [assets, searchTerm, typeFilter, statusFilter])

  // Helper para renderizar ícones por tipo
  const renderTypeIcon = (type: AssetType) => {
    switch (type) {
      case 'page':
        return <Facebook className="h-4 w-4 text-blue-600" />
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />
      case 'business':
        return <Briefcase className="h-4 w-4 text-purple-600" />
      case 'ad_account':
        return <Megaphone className="h-4 w-4 text-amber-600" />
      case 'waba':
        return <MessageSquare className="h-4 w-4 text-emerald-600" />
      default:
        return <Layers className="h-4 w-4 text-slate-500" />
    }
  }

  // Helper para traduzir o tipo
  const getTypeText = (type: AssetType) => {
    switch (type) {
      case 'page':
        return 'Página do Facebook'
      case 'instagram':
        return 'Conta Instagram'
      case 'business':
        return 'Portfólio de Negócios'
      case 'ad_account':
        return 'Conta de Anúncios'
      case 'waba':
        return 'WhatsApp Business (WABA)'
      default:
        return 'Outro Ativo'
    }
  }

  const activeAppId = getInstagramActiveAppId(user)
  const redirectUri = getInstagramRedirectUri()

  const handleReauthorizeOAuth = () => {
    const oauthUrl = getInstagramOAuthUrl(activeAppId, redirectUri, undefined, true)
    window.open(oauthUrl, '_blank')
    toast({
      title: 'Abrindo autorização da Meta',
      description: 'Autorize os escopos completos para leitura avançada de negócios e páginas.',
    })
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header com apresentação visual */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400">
              <Trash2 className="h-6 w-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Faxina de Ativos Meta
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
            Painel de organização e checklist de ativos Meta Business. Elimine portfólios órfãos,
            páginas duplicadas e contas legadas mantendo as regras invioláveis de proteção da BRF
            Imóveis.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => fetchAssets(true)}
            disabled={loading || refreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Varrendo Meta...' : 'Atualizar Ativos'}</span>
          </Button>

          <Button
            asChild
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-xs"
          >
            <a
              href="https://business.facebook.com/settings/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Abrir Meta Business</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {/* Regras Críticas de Proteção (INVIOLÁVEIS) */}
      <Card className="border-emerald-500/30 bg-emerald-500/5 shadow-xs">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3.5">
          <div className="p-2 rounded-md bg-emerald-600 text-white shrink-0 mt-0.5">
            <Lock className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <p className="font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-2">
              <span>Regras Críticas de Proteção Aprovadas (Invioláveis)</span>
              <Badge className="bg-emerald-600 text-white text-[10px] font-medium tracking-wide">
                100% PROTEGIDO
              </Badge>
            </p>
            <div className="text-emerald-900/90 dark:text-emerald-300/90 text-xs leading-relaxed space-y-1">
              <p>
                <strong>1. Portfólio do WhatsApp Oficial:</strong> O Business Manager que abriga o
                WABA oficial da Bia e o número comercial <strong>+55 48 99209-8050</strong> está
                travado contra qualquer tipo de exclusão.
              </p>
              <p>
                <strong>2. Página Oficial BRF Imóveis:</strong> A Página oficial com ID{' '}
                <code className="font-mono bg-white/80 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-emerald-500/30 font-semibold">
                  1219427617930954
                </code>{' '}
                é intocável.
              </p>
              <p className="text-muted-foreground pt-0.5">
                * A API da Meta não permite deletar Páginas ou Portfólios diretamente por segurança.
                Use os botões <strong>&quot;Excluir no Meta Business&quot;</strong> para ir direto
                ao local exato da exclusão e marque como <strong>&quot;Limpo&quot;</strong> aqui
                para salvar seu progresso.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerta de Escopos / Permissões Meta (se faltar algum) */}
      {tokenDiagnostics.missing_scopes.length > 0 && (
        <Alert className="border-amber-500/40 bg-amber-500/10 text-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <AlertTitle className="text-amber-900 font-semibold text-sm">
            Permissões adicionais da Meta recomendadas
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-800 mt-1 space-y-2">
            <p>
              Para listar 100% dos portfólios e páginas restritas na Graph API, o seu token pode se
              beneficiar dos seguintes escopos:{' '}
              {tokenDiagnostics.missing_scopes.map((s) => (
                <code
                  key={s}
                  className="font-mono bg-amber-200/60 text-amber-900 px-1 py-0.5 rounded mr-1 text-[11px]"
                >
                  {s}
                </code>
              ))}
              . O CRM carregou os ativos conhecidos e varridos disponíveis sem quebrar o painel.
            </p>
            <Button
              onClick={handleReauthorizeOAuth}
              size="sm"
              variant="outline"
              className="text-xs bg-white hover:bg-amber-50 text-amber-900 border-amber-300 gap-1.5"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              Reautorizar Token com Escopos Completos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Destaque Caso Conhecido: IG antigo/duplicado "brf_imoveis_" */}
      {assets.some((a) => a.is_known_duplicate && a.status === 'pending') && (
        <Card className="border-pink-500/40 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Instagram className="h-5 w-5 text-pink-600" />
                <CardTitle className="text-base sm:text-lg text-slate-900 dark:text-slate-100">
                  Ação Prioritária: Instagram Antigo / Duplicado Encontrado
                </CardTitle>
              </div>
              <Badge variant="destructive" className="text-xs">
                Candidato a Limpeza
              </Badge>
            </div>
            <CardDescription className="text-xs sm:text-sm">
              Identificamos a conta legada <strong>@brf_imoveis_</strong> que causava conflitos na
              Central de Contas do Mauro e bloqueava o vínculo correto.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/80 p-3 rounded-lg border">
              <div className="space-y-0.5">
                <span className="font-semibold text-sm">@brf_imoveis_</span>
                <p className="text-xs text-muted-foreground">
                  Desvincule da Central de Contas pelo app do Instagram no celular ou nas
                  Configurações do Meta Business.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1.5 border-pink-300 text-pink-700 hover:bg-pink-50"
                >
                  <a
                    href="https://accountscenter.facebook.com/profiles"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span>Central de Contas</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const igAsset = assets.find((a) => a.id === 'brf_imoveis_')
                    if (igAsset) handleStatusChange(igAsset, 'cleaned')
                  }}
                  disabled={updatingId === 'brf_imoveis_'}
                  className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Marcar @brf_imoveis_ como Limpo</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cartões de Progresso e Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="p-3 sm:p-5 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Progresso da Limpeza</span>
              <Sparkles className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0 space-y-2">
            <div className="text-xl sm:text-2xl font-bold">
              {summary.progress_percentage}%{' '}
              <span className="text-xs font-normal text-muted-foreground">concluído</span>
            </div>
            <Progress value={summary.progress_percentage} className="h-2" />
            <p className="text-[11px] text-muted-foreground">
              {summary.cleaned} de {summary.cleanable_total} passíveis de limpeza
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-5 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Ativos Protegidos</span>
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              {summary.protected}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Imunes contra remoção ou perda</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-5 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Já Limpos</span>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{summary.cleaned}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Excluídos ou arquivados na Meta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-5 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground flex items-center justify-between">
              <span>Pendentes de Análise</span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-5 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-amber-600">
              {summary.cleanable_pending}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Aguardando decisão</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="shadow-xs">
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ID ou usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs sm:text-sm"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-auto">
                <TabsList className="h-9">
                  <TabsTrigger value="all" className="text-xs">
                    Todos ({assets.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending" className="text-xs">
                    Pendentes ({summary.pending})
                  </TabsTrigger>
                  <TabsTrigger value="cleaned" className="text-xs">
                    Limpos ({summary.cleaned})
                  </TabsTrigger>
                  <TabsTrigger value="protected" className="text-xs">
                    Protegidos ({summary.protected})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t text-xs text-muted-foreground">
            <Filter className="h-3.5 w-3.5 mr-1" />
            <span>Filtrar tipo:</span>
            {[
              { id: 'all', label: 'Todos os tipos' },
              { id: 'page', label: 'Páginas' },
              { id: 'instagram', label: 'Instagram' },
              { id: 'business', label: 'Portfólios' },
              { id: 'ad_account', label: 'Contas de Anúncio' },
              { id: 'waba', label: 'WhatsApp' },
            ].map((t) => (
              <Button
                key={t.id}
                type="button"
                variant={typeFilter === t.id ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setTypeFilter(t.id)}
                className="h-7 text-xs px-2.5"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista de Ativos Meta em Cards */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border space-y-3">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Varrendo ativos da sua conta Meta...</p>
            <p className="text-xs text-muted-foreground">
              Consultando páginas, contas de anúncio, portfólios e Instagram.
            </p>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border space-y-2">
            <Info className="h-8 w-8 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">Nenhum ativo corresponde aos filtros aplicados.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('')
                setTypeFilter('all')
                setStatusFilter('all')
              }}
            >
              Limpar Filtros
            </Button>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const isUpdating = updatingId === asset.id
            const isOfficial = asset.is_protected

            return (
              <Card
                key={asset.id}
                className={`transition-all shadow-xs ${
                  isOfficial
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : asset.is_known_duplicate
                      ? 'border-pink-500/40 bg-pink-500/5'
                      : asset.status === 'cleaned'
                        ? 'border-green-500/30 bg-green-500/5 opacity-85'
                        : 'hover:border-slate-300'
                }`}
              >
                <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Informações do Ativo */}
                  <div className="space-y-2 max-w-2xl">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="p-1.5 rounded-md bg-muted flex items-center justify-center shrink-0">
                        {renderTypeIcon(asset.type)}
                      </span>
                      <h3 className="font-semibold text-sm sm:text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{asset.name}</span>
                        {asset.username && (
                          <span className="text-xs text-muted-foreground font-mono font-normal">
                            @{asset.username}
                          </span>
                        )}
                      </h3>

                      {/* Selo Protegido */}
                      {isOfficial ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[11px] gap-1 font-semibold shadow-xs">
                          <Lock className="h-3 w-3" />
                          PROTEGIDO — NÃO EXCLUIR
                        </Badge>
                      ) : asset.is_known_duplicate ? (
                        <Badge variant="destructive" className="bg-pink-600 text-white text-[10px]">
                          Duplicado / Antigo
                        </Badge>
                      ) : null}

                      {/* Badge de Status Atual */}
                      {asset.status === 'cleaned' ? (
                        <Badge className="bg-green-600 text-white text-[10px] gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Limpo no Meta
                        </Badge>
                      ) : asset.status === 'kept' ? (
                        <Badge variant="secondary" className="text-[10px]">
                          Mantido
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-700 border-amber-300 bg-amber-50"
                        >
                          Pendente
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span>
                        Tipo: <strong>{getTypeText(asset.type)}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        ID:{' '}
                        <code className="font-mono bg-muted px-1.5 py-0.5 rounded">{asset.id}</code>
                      </span>
                      {asset.cleaned_at && (
                        <>
                          <span>•</span>
                          <span className="text-green-700 font-medium">
                            Limpo em {new Date(asset.cleaned_at).toLocaleDateString('pt-BR')}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Explicações e Alertas */}
                    {asset.protection_reason && (
                      <p className="text-xs text-emerald-800 dark:text-emerald-300 font-medium bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                        {asset.protection_reason}
                      </p>
                    )}
                    {asset.duplicate_notes && !isOfficial && (
                      <p className="text-xs text-pink-800 dark:text-pink-300 bg-pink-500/10 p-2 rounded border border-pink-500/20">
                        {asset.duplicate_notes}
                      </p>
                    )}
                  </div>

                  {/* Ações e Links Diretos */}
                  <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0">
                    {/* Link Direto para o Meta Business onde acontece a exclusão */}
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 h-8 w-full sm:w-auto"
                    >
                      <a
                        href={asset.direct_url || 'https://business.facebook.com/settings/'}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>Gerenciar na Meta</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </Button>

                    {/* Controles de Status do Checklist */}
                    {isOfficial ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium py-1">
                        <ShieldCheck className="h-4 w-4" />
                        <span>Preservação Mandatória</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 w-full sm:w-auto">
                        {asset.status !== 'cleaned' ? (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(asset, 'cleaned')}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs gap-1 h-8 flex-1 sm:flex-initial"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Marcar como Limpo</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(asset, 'pending')}
                            className="text-xs text-muted-foreground h-8"
                          >
                            <span>Desfazer</span>
                          </Button>
                        )}

                        {asset.status !== 'kept' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(asset, 'kept')}
                            className="text-xs h-8"
                          >
                            <span>Manter</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isUpdating}
                            onClick={() => handleStatusChange(asset, 'pending')}
                            className="text-xs text-muted-foreground h-8"
                          >
                            <span>Desfazer</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Card Informativo com Instruções de Exclusão Manual */}
      <Card className="bg-muted/40 border-dashed">
        <CardContent className="p-4 sm:p-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground text-sm">
              Como funciona a exclusão na Meta Graph API e no Business Manager:
            </p>
            <p>
              Por motivos de conformidade e segurança da Meta, nenhuma aplicação externa (como este
              CRM ou qualquer outra ferramenta de terceiros) tem permissão de destruir
              definitivamente Páginas ou Contas de Negócio via API direta. A exclusão final sempre
              exige a confirmação manual do proprietário dentro do{' '}
              <strong>Meta Business Manager</strong>.
            </p>
            <p>
              Este painel funciona como sua <strong>Central de Comando e Checklist Oficial</strong>:
              ele identifica tudo que existe nas suas contas, protege o que não pode ser tocado de
              jeito nenhum (como seu WhatsApp e Página oficial) e fornece os atalhos diretos para
              você executar a limpeza sem se perder. O progresso fica salvo no CRM e sobrevive a
              qualquer nova sessão!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
