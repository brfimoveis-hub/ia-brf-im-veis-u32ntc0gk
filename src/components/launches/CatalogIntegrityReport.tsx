import { useState, useEffect } from 'react'
import {
  type CatalogIntegritySummary,
  type PropertyIntegrityReportItem,
  type CatalogSyncStatusResponse,
  getCatalogIntegrityReport,
  triggerCatalogSync,
  getCatalogSyncStatus,
  triggerAiKnowledgeAutoOrganize,
} from '@/services/catalog_integrity'
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  FileText,
  Search,
  Filter,
  Layers,
  Sparkles,
  Link2,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck2,
  FolderOpen,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'

interface CatalogIntegrityReportProps {
  userId?: string
  onSelectProperty?: (propertyId: string) => void
  onRefreshKnowledgeFiles?: () => void
}

export function CatalogIntegrityReport({
  userId,
  onSelectProperty,
  onRefreshKnowledgeFiles,
}: CatalogIntegrityReportProps) {
  const [report, setReport] = useState<CatalogIntegritySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<CatalogSyncStatusResponse | null>(null)
  const [autoOrganizing, setAutoOrganizing] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'incomplete'>('all')
  const [missingFilter, setMissingFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const loadReport = async () => {
    setLoading(true)
    try {
      const data = await getCatalogIntegrityReport(userId)
      setReport(data)
    } catch (err: any) {
      console.error('Erro ao carregar relatório de integridade:', err)
      toast({
        title: 'Erro ao analisar catálogo',
        description: 'Não foi possível carregar o diagnóstico de integridade.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [userId])

  // Polling de status enquanto estiver em fila ('queued') ou em execução ('running')
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    if (syncing || syncStatus?.status === 'queued' || syncStatus?.status === 'running') {
      timer = setInterval(async () => {
        try {
          const st = await getCatalogSyncStatus()
          setSyncStatus(st)

          if (st.status === 'completed') {
            setSyncing(false)
            toast({
              title: 'Sincronização concluída com sucesso!',
              description:
                st.message ||
                `${st.updated + st.created} imóveis sincronizados com o site oficial.`,
            })
            await loadReport()
            if (onRefreshKnowledgeFiles) onRefreshKnowledgeFiles()
          } else if (st.status === 'failed' || st.status === 'error') {
            setSyncing(false)
            toast({
              title: 'Falha na sincronização',
              description: st.message || st.error || 'Erro no processamento da sincronização.',
              variant: 'destructive',
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }, 4000)
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [syncing, syncStatus?.status])

  const handleSyncSite = async () => {
    setSyncing(true)
    try {
      const res = await triggerCatalogSync()
      toast({
        title: 'Sincronização iniciada em segundo plano!',
        description:
          res.message || 'O catálogo está sendo sincronizado e auditado com o site oficial.',
      })

      // Consulta status inicial
      const initialStatus = await getCatalogSyncStatus()
      setSyncStatus(initialStatus)

      if (initialStatus.status === 'completed') {
        setSyncing(false)
        await loadReport()
        if (onRefreshKnowledgeFiles) onRefreshKnowledgeFiles()
      }
    } catch (err: any) {
      setSyncing(false)
      const errorMsg =
        err?.message ||
        'Não foi possível iniciar a sincronização com o site oficial. Verifique a conexão com o servidor.'
      toast({
        title: 'Falha na sincronização',
        description: errorMsg,
        variant: 'destructive',
      })
    }
  }

  const handleAutoOrganizeFiles = async () => {
    setAutoOrganizing(true)
    try {
      const res = await triggerAiKnowledgeAutoOrganize()
      toast({
        title: 'Auto-organização concluída!',
        description: `${res.updated_count} arquivo(s) vinculados imediatamente aos dossiês dos imóveis.`,
      })
      await loadReport()
      if (onRefreshKnowledgeFiles) onRefreshKnowledgeFiles()
    } catch (err: any) {
      toast({
        title: 'Falha na auto-organização',
        description: err?.message || 'Erro ao reprocessar arquivos.',
        variant: 'destructive',
      })
    } finally {
      setAutoOrganizing(false)
    }
  }

  const filteredItems = (report?.items || []).filter((item) => {
    // Status filter
    if (statusFilter === 'complete' && !item.is_complete) return false
    if (statusFilter === 'incomplete' && item.is_complete) return false

    // Missing filter
    if (missingFilter !== 'all') {
      const hasMissingKey = item.missing_items.some((m) => m.key === missingFilter)
      if (!hasMissingKey) return false
    }

    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase()
      const match =
        item.title.toLowerCase().includes(s) ||
        item.code.toLowerCase().includes(s) ||
        item.city.toLowerCase().includes(s) ||
        item.neighborhood.toLowerCase().includes(s) ||
        (item.associated_launch?.name || '').toLowerCase().includes(s)
      if (!match) return false
    }

    return true
  })

  return (
    <Card className="border-emerald-500/20 shadow-sm overflow-hidden bg-card">
      <CardHeader className="bg-emerald-500/5 pb-4 border-b border-emerald-500/10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-foreground">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                Relatório de Integridade de Imóveis & Dossiês
              </CardTitle>
              {report && (
                <Badge
                  variant="outline"
                  className={
                    report.incomplete_count === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }
                >
                  {report.incomplete_count === 0
                    ? '100% dos Imóveis Completos'
                    : `${report.incomplete_count} Incompletos de ${report.total_properties}`}
                </Badge>
              )}
            </div>
            <CardDescription className="mt-1 text-xs sm:text-sm">
              Auditoria em tempo real: link individual no site oficial (brfimoveis.com.br), preço
              vigente, arquivo de plantas e tabela/ebook acoplados no dossiê de cada imóvel.
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoOrganizeFiles}
              disabled={autoOrganizing || loading}
              className="h-8 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50"
              title="Organizar arquivos imediatamente dentro do dossiê do respectivo imóvel"
            >
              <Sparkles className={`w-3.5 h-3.5 ${autoOrganizing ? 'animate-spin' : ''}`} />
              {autoOrganizing ? 'Organizando...' : 'Auto-Organizar Arquivos'}
            </Button>

            <Button
              variant="default"
              size="sm"
              onClick={handleSyncSite}
              disabled={syncing || loading}
              className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              title="Job diário roda às ~05h. Clique para sincronizar agora com o site"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar com Site'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 p-3 sm:p-6">
        {/* BANNER DE STATUS DA SINCRONIZAÇÃO EM ANDAMENTO OU RECENTE */}
        {syncStatus && (syncStatus.status === 'queued' || syncStatus.status === 'running') && (
          <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-emerald-600 animate-spin shrink-0" />
              <div>
                <span className="font-semibold text-emerald-950 dark:text-emerald-100 block">
                  {syncStatus.status === 'queued'
                    ? 'Sincronização na fila de execução...'
                    : 'Sincronizando imóveis em segundo plano...'}
                </span>
                <span className="text-muted-foreground text-[11px]">
                  {syncStatus.message || 'Auditando os 49 links canônicos do site oficial.'}
                </span>
              </div>
            </div>
            <Badge
              variant="outline"
              className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
            >
              Assíncrono Ativo
            </Badge>
          </div>
        )}

        {/* KPI CARDS */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : report ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 block uppercase">
                Dossiês Completos
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
                  {report.complete_count}
                </span>
                <span className="text-xs text-muted-foreground">de {report.total_properties}</span>
              </div>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                Código + Link oficial + Preço + Descrição
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
              <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 block uppercase">
                Dossiês Incompletos
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-amber-800 dark:text-amber-200">
                  {report.incomplete_count}
                </span>
                <span className="text-xs text-muted-foreground">precisam de atenção</span>
              </div>
              <p className="text-[10px] text-amber-600 mt-0.5">
                Falta código, link oficial, preço ou descrição
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block uppercase">
                Sem Link do Site
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {report.missing_url_count}
                </span>
                <span className="text-xs text-muted-foreground">imóveis</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Sem URL individual oficial</p>
            </div>

            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 border-slate-200">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block uppercase">
                Arquivos s/ Vínculo
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                  {report.unlinked_files_count}
                </span>
                <span className="text-xs text-muted-foreground">na base IA</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">Grupo Geral/Institucional</p>
            </div>
          </div>
        ) : null}

        {/* BARRA DE FILTROS E BUSCA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar imóvel no relatório por código, nome ou bairro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-9 text-xs w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="complete">Apenas Completos</SelectItem>
                <SelectItem value="incomplete">Apenas Incompletos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={missingFilter} onValueChange={setMissingFilter}>
              <SelectTrigger className="h-9 text-xs w-[170px]">
                <SelectValue placeholder="O que falta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as pendências</SelectItem>
                <SelectItem value="website_url">Sem Link Oficial</SelectItem>
                <SelectItem value="price">Sem Preço</SelectItem>
                <SelectItem value="knowledge_files">Sem Arquivos Vinculados</SelectItem>
                <SelectItem value="floor_plans">Sem Plantas</SelectItem>
                <SelectItem value="ebook_or_table">Sem Tabela/Ebook</SelectItem>
              </SelectContent>
            </Select>

            {(statusFilter !== 'all' || missingFilter !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all')
                  setMissingFilter('all')
                  setSearch('')
                }}
                className="h-9 text-xs text-muted-foreground"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {/* LISTA AUDITADA DE IMÓVEIS */}
        {loading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/10">
            <p className="text-sm font-medium">Nenhum imóvel encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="divide-y rounded-lg border bg-card overflow-hidden">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 sm:p-4 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                  item.is_complete
                    ? 'hover:bg-muted/20'
                    : 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/40'
                }`}
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted border">
                      {item.code}
                    </span>
                    <span className="font-semibold text-sm text-foreground truncate max-w-sm sm:max-w-md">
                      {item.title}
                    </span>
                    {item.is_complete ? (
                      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] h-5 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        COMPLETO
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-300 text-[10px] h-5 gap-1"
                      >
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        INCOMPLETO ({item.missing_items.length} pendência
                        {item.missing_items.length > 1 ? 's' : ''})
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {item.property_type}
                    </Badge>
                  </div>

                  {/* Informações detalhadas do cadastro */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>
                      Local: <strong>{item.neighborhood || 'Bairro s/ inf.'}</strong>, {item.city}
                    </span>
                    <span>•</span>
                    <span>
                      Valor: <strong className="text-foreground">{item.price_formatted}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FolderOpen className="w-3 h-3 text-primary" />
                      Dossiê IA:{' '}
                      <strong>
                        {item.linked_files_count} arquivo{item.linked_files_count === 1 ? '' : 's'}
                      </strong>
                    </span>
                  </div>

                  {/* Diagnóstico do que falta */}
                  {!item.is_complete && (
                    <div className="mt-2 p-2.5 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-1">
                      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />O QUE FALTA NESTE IMÓVEL
                        PARA ELIMINAR PROBLEMAS:
                      </p>
                      <ul className="text-xs text-amber-900 dark:text-amber-200 list-disc list-inside space-y-0.5">
                        {item.missing_items.map((m) => (
                          <li key={m.key}>
                            <strong>{m.label}:</strong> {m.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Lançamento associado (se houver) */}
                  {item.associated_launch && (
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-0.5">
                      <Building2 className="w-3 h-3 text-emerald-600" />
                      <span>
                        Lançamento acoplado à Bia Mãe:{' '}
                        <strong>{item.associated_launch.name}</strong> (
                        {item.associated_launch.status})
                      </span>
                    </div>
                  )}
                </div>

                {/* Ações do Imóvel */}
                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded transition-colors"
                      title="Abrir página oficial do imóvel no site"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Página no Site
                    </a>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-rose-600 border-rose-300">
                      Sem link no site
                    </Badge>
                  )}

                  {onSelectProperty && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onSelectProperty(item.id)}
                      className="h-7 text-xs gap-1"
                    >
                      Ver no Dossiê <ArrowRight className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
