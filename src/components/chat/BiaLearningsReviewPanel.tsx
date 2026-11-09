import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Brain,
  Clock,
  User,
  ShieldCheck,
  Zap,
  ArrowUpDown,
  Calendar,
  Building2,
  Play,
} from 'lucide-react'
import { BiaTestSuiteModal } from './BiaTestSuiteModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { cn, formatPhone } from '@/lib/utils'
import {
  type BiaLearning,
  type BiaLearningType,
  getBiaLearnings,
  approveBiaLearning,
  discardBiaLearning,
  triggerWeeklyReguaConsolidation,
} from '@/services/bia_learnings'

interface BiaLearningsReviewPanelProps {
  className?: string
  compact?: boolean
  onUpdated?: () => void
}

type TypeFilterOption = 'all' | BiaLearningType | 'CONSTITUICAO'
type StatusFilterOption = 'all' | 'aprovado' | 'pendente' | 'descartado' | 'em_revisao'

export function BiaLearningsReviewPanel({
  className,
  compact = false,
  onUpdated,
}: BiaLearningsReviewPanelProps) {
  const { toast } = useToast()

  const [learnings, setLearnings] = useState<BiaLearning[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [isConsolidating, setIsConsolidating] = useState<boolean>(false)
  const [showTestSuiteModal, setShowTestSuiteModal] = useState<boolean>(false)

  // Filtros
  const [typeFilter, setTypeFilter] = useState<TypeFilterOption>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [sortBy, setSortBy] = useState<'priority' | 'date'>('priority')

  const loadData = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true)
      try {
        const data = await getBiaLearnings()
        setLearnings(data)
      } catch (err) {
        console.error('Erro ao carregar lições do caderno:', err)
        toast({
          title: 'Erro ao carregar caderno',
          description: 'Não foi possível carregar as lições da Bia.',
          variant: 'destructive',
        })
      } finally {
        if (!quiet) setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  // Aprovar lição
  const handleApprove = async (id: string, title: string) => {
    setActionId(id)
    try {
      const updated = await approveBiaLearning(id, 'Mauro')
      setLearnings((prev) => prev.map((item) => (item.id === id ? updated : item)))
      toast({
        title: 'Lição Aprovada!',
        description: `"${title}" agora está ativa no cérebro da Bia.`,
      })
      onUpdated?.()
    } catch (err) {
      console.error('Erro ao aprovar lição:', err)
      toast({
        title: 'Falha ao aprovar',
        description: 'Ocorreu um erro ao aprovar a lição.',
        variant: 'destructive',
      })
    } finally {
      setActionId(null)
    }
  }

  // Descartar lição
  const handleDiscard = async (id: string, title: string) => {
    setActionId(id)
    try {
      const updated = await discardBiaLearning(id, 'Mauro')
      setLearnings((prev) => prev.map((item) => (item.id === id ? updated : item)))
      toast({
        title: 'Lição Descartada',
        description: `"${title}" foi desativada e não será usada pela Bia.`,
      })
      onUpdated?.()
    } catch (err) {
      console.error('Erro ao descartar lição:', err)
      toast({
        title: 'Falha ao descartar',
        description: 'Ocorreu um erro ao descartar a lição.',
        variant: 'destructive',
      })
    } finally {
      setActionId(null)
    }
  }

  // Disparar consolidação semanal da régua
  const handleConsolidateWeekly = async () => {
    setIsConsolidating(true)
    try {
      const res = await triggerWeeklyReguaConsolidation()
      toast({
        title: 'Consolidação Concluída!',
        description: res.message || 'Nova lição de acerto gerada com o aprendizado da semana.',
      })
      await loadData(true)
      onUpdated?.()
    } catch (err: unknown) {
      console.error('Erro ao consolidar régua:', err)
      const msg = err instanceof Error ? err.message : String(err)
      toast({
        title: 'Falha na consolidação',
        description: msg || 'Não foi possível disparar a consolidação semanal.',
        variant: 'destructive',
      })
    } finally {
      setIsConsolidating(false)
    }
  }

  // Métricas do caderno
  const counts = useMemo(() => {
    const total = learnings.length
    const seeds = learnings.filter((l) => l.origin === 'seed_expert').length
    const errors = learnings.filter((l) => l.learning_type === 'ERRO').length
    const successes = learnings.filter((l) => l.learning_type === 'ACERTO').length
    const objections = learnings.filter((l) => l.learning_type === 'OBJECOES').length
    const questions = learnings.filter((l) => l.learning_type === 'DUVIDA_SEM_RESPOSTA').length
    const pending = learnings.filter(
      (l) => l.status === 'pendente' || (!l.status && l.origin === 'auto'),
    ).length
    const approved = learnings.filter(
      (l) => l.status === 'aprovado' || (l.is_active && !l.status),
    ).length
    const inReview = learnings.filter((l) => l.status === 'em_revisao' || !!l.conflict_flag).length

    return { total, seeds, errors, successes, objections, questions, pending, approved, inReview }
  }, [learnings])

  // Filtragem e ordenação
  const filteredList = useMemo(() => {
    return learnings
      .filter((item) => {
        // Filtro por tipo/categoria
        if (typeFilter !== 'all') {
          if (typeFilter === 'CONSTITUICAO') {
            const isConst =
              item.priority >= 1000 ||
              item.title.toLowerCase().includes('constituição') ||
              item.title.toLowerCase().includes('constituicao')
            if (!isConst) return false
          } else if (item.learning_type !== typeFilter) {
            return false
          }
        }

        // Filtro por status
        if (statusFilter !== 'all') {
          const st = item.status || (item.is_active ? 'aprovado' : 'descartado')
          if (statusFilter === 'pendente' && st !== 'pendente') return false
          if (statusFilter === 'aprovado' && st !== 'aprovado') return false
          if (statusFilter === 'descartado' && st !== 'descartado') return false
          if (statusFilter === 'em_revisao' && st !== 'em_revisao') return false
        }

        // Filtro por busca de texto
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase()
          const inTitle = (item.title || '').toLowerCase().includes(term)
          const inRule = (item.rule_text || '').toLowerCase().includes(term)
          const inAuthor = (item.author || '').toLowerCase().includes(term)
          const inCustomer = (item.context_customer || '').toLowerCase().includes(term)
          const inProp = (item.context_property || '').toLowerCase().includes(term)
          return inTitle || inRule || inAuthor || inCustomer || inProp
        }

        return true
      })
      .sort((a, b) => {
        if (sortBy === 'priority') {
          return (b.priority || 0) - (a.priority || 0)
        }
        return new Date(b.created).getTime() - new Date(a.created).getTime()
      })
  }, [learnings, typeFilter, statusFilter, searchTerm, sortBy])

  // Renderizadores de badges com estilo
  const renderTypeBadge = (type?: BiaLearningType, isConstitution = false) => {
    if (isConstitution) {
      return (
        <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] gap-1 font-bold shadow-xs">
          <ShieldCheck className="h-3 w-3" />
          CONSTITUIÇÃO
        </Badge>
      )
    }

    switch (type) {
      case 'ERRO':
        return (
          <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 text-[10px] gap-1 font-bold">
            <AlertTriangle className="h-3 w-3 text-red-600" />
            ERRO
          </Badge>
        )
      case 'ACERTO':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 text-[10px] gap-1 font-bold">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
            ACERTO
          </Badge>
        )
      case 'OBJECOES':
        return (
          <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] gap-1 font-bold">
            <TrendingUp className="h-3 w-3 text-amber-600" />
            OBJEÇÃO
          </Badge>
        )
      case 'DUVIDA_SEM_RESPOSTA':
        return (
          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800 text-[10px] gap-1 font-bold">
            <HelpCircle className="h-3 w-3 text-blue-600" />
            DÚVIDA S/ RESPOSTA
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">
            DIRETRIZ
          </Badge>
        )
    }
  }

  const renderStatusBadge = (status?: string, isActive = true) => {
    const st = status || (isActive ? 'aprovado' : 'descartado')
    if (st === 'aprovado') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Aprovado
        </span>
      )
    }
    if (st === 'pendente') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="h-3 w-3 text-amber-500" />
          Pendente Revisão
        </span>
      )
    }
    if (st === 'descartado') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <XCircle className="h-3 w-3 text-slate-400" />
          Descartado
        </span>
      )
    }
    if (st === 'em_revisao') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
          <AlertTriangle className="h-3 w-3 text-rose-500" />
          Contradição / Revisão
        </span>
      )
    }
    return null
  }

  const formatDate = (isoStr: string) => {
    if (!isoStr) return '-'
    try {
      const d = new Date(isoStr)
      if (Number.isNaN(d.getTime())) return isoStr
      const day = String(d.getDate()).padStart(2, '0')
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const hours = String(d.getHours()).padStart(2, '0')
      const mins = String(d.getMinutes()).padStart(2, '0')
      return `${day}/${month} às ${hours}:${mins}`
    } catch {
      return isoStr
    }
  }

  return (
    <Card className={cn('border-emerald-500/25 shadow-xs overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-emerald-50/60 via-amber-50/30 to-background dark:from-emerald-950/20 dark:via-amber-950/10 dark:to-background p-3 sm:p-4 border-b border-emerald-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Caderno de Lições Vivas da Bia</span>
                  <Badge
                    variant="outline"
                    className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold"
                  >
                    {counts.approved} ativas no cérebro
                  </Badge>
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
                Painel do Mauro para aprovar/descartar lições aprendidas (Erros, Acertos, Objeções e
                Dúvidas). As lições semente e aprovadas guiam a IA na hora de responder.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleConsolidateWeekly}
              disabled={isConsolidating}
              className="h-8 text-xs gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 font-medium"
              title="Disparar a consolidação semanal dos 4 textos da régua"
            >
              <Zap
                className={cn(
                  'h-3.5 w-3.5 text-amber-500 fill-amber-500',
                  isConsolidating && 'animate-spin',
                )}
              />
              <span>{isConsolidating ? 'Consolidando...' : 'Consolidar Régua Semanal'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={loading}
              className="h-8 text-xs gap-1"
              title="Recarregar lições"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loading && 'animate-spin text-emerald-600')}
              />
              <span className="hidden xs:inline">Atualizar</span>
            </Button>
          </div>
        </div>

        {/* Resumo visual rápido por chips de categoria */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 scrollbar-none -mx-1 px-1">
          <button
            type="button"
            onClick={() => setTypeFilter('all')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all border',
              typeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-300',
            )}
          >
            <span>Todas</span>
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-slate-200/60 dark:bg-slate-700">
              {counts.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('ACERTO')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border',
              typeFilter === 'ACERTO'
                ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400',
            )}
          >
            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
            <span>Acertos</span>
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950">
              {counts.successes}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('ERRO')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border',
              typeFilter === 'ERRO'
                ? 'bg-red-600 text-white border-red-600 font-bold'
                : 'bg-white dark:bg-slate-800 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800/60 hover:border-red-400',
            )}
          >
            <AlertTriangle className="h-3 w-3 text-red-500" />
            <span>Erros</span>
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-red-100 dark:bg-red-950">
              {counts.errors}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('OBJECOES')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border',
              typeFilter === 'OBJECOES'
                ? 'bg-amber-600 text-white border-amber-600 font-bold'
                : 'bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
            )}
          >
            <TrendingUp className="h-3 w-3 text-amber-500" />
            <span>Objeções</span>
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-amber-100 dark:bg-amber-950">
              {counts.objections}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('DUVIDA_SEM_RESPOSTA')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border',
              typeFilter === 'DUVIDA_SEM_RESPOSTA'
                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                : 'bg-white dark:bg-slate-800 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:border-blue-400',
            )}
          >
            <HelpCircle className="h-3 w-3 text-blue-500" />
            <span>Dúvidas</span>
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-blue-100 dark:bg-blue-950">
              {counts.questions}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTypeFilter('CONSTITUICAO')}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-all border',
              typeFilter === 'CONSTITUICAO'
                ? 'bg-purple-600 text-white border-purple-600 font-bold'
                : 'bg-white dark:bg-slate-800 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800/60 hover:border-purple-400',
            )}
          >
            <ShieldCheck className="h-3 w-3 text-purple-500" />
            <span>Constituição v6.0 Soberana</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTestSuiteModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap transition-all border bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 dark:text-purple-200 dark:border-purple-700 shadow-xs ml-auto"
            title="Executar Bateria de 22 Testes da Bia v6.0"
          >
            <Play className="h-3 w-3 fill-current text-purple-600 dark:text-purple-400" />
            <span>Testar Bia v6.0 (22 Cenários)</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Barra de Filtros e Busca Mobile-Friendly */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por resumo, regra, imóvel ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs bg-slate-50/70 dark:bg-slate-800/50"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded text-[11px]">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-2 py-0.5 rounded font-medium',
                  statusFilter === 'all'
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-900 dark:text-white'
                    : 'text-muted-foreground',
                )}
              >
                Todos Status
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('aprovado')}
                className={cn(
                  'px-2 py-0.5 rounded font-medium',
                  statusFilter === 'aprovado'
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-emerald-600'
                    : 'text-muted-foreground',
                )}
              >
                Aprovados
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('pendente')}
                className={cn(
                  'px-2 py-0.5 rounded font-medium',
                  statusFilter === 'pendente'
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-amber-600'
                    : 'text-muted-foreground',
                )}
              >
                Pendentes
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('descartado')}
                className={cn(
                  'px-2 py-0.5 rounded font-medium',
                  statusFilter === 'descartado'
                    ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-600'
                    : 'text-muted-foreground',
                )}
              >
                Descartados
              </button>
            </div>

            {/* Ordenação */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSortBy((prev) => (prev === 'priority' ? 'date' : 'priority'))}
              className="h-8 px-2 text-xs gap-1 text-slate-600 dark:text-slate-300"
              title="Alternar ordenação"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>{sortBy === 'priority' ? 'Prioridade' : 'Mais recentes'}</span>
            </Button>
          </div>
        </div>

        {/* Informação contextual do limite do cérebro */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 flex-wrap gap-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>
              <strong>Loop de Aprendizado Ativo:</strong> As lições aprovadas de experts e
              atendimentos são injetadas automaticamente abaixo da Constituição v4.0 (respeitando
              limite de 1.450 caracteres e anti-duplicação).
            </span>
          </div>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {filteredList.length} lições exibidas
          </span>
        </div>

        {/* Lista de Lições */}
        {loading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/20">
            <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="font-medium text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              Nenhuma lição encontrada para os filtros selecionados.
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Experimente limpar o campo de busca ou selecionar "Todas" para rever todo o caderno.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredList.map((item) => {
              const isWorking = actionId === item.id
              const isConstitution =
                item.priority >= 1000 ||
                item.title.toLowerCase().includes('constituição') ||
                item.title.toLowerCase().includes('constituicao')
              const isSeed = item.origin === 'seed_expert'
              const isAuto = item.origin === 'auto'
              const isCron = item.origin === 'cron_semanal'

              return (
                <div
                  key={item.id}
                  className={cn(
                    'p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col gap-2.5',
                    item.is_active
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs hover:border-emerald-300 dark:hover:border-emerald-800'
                      : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-75',
                    item.conflict_flag && 'border-rose-400 bg-rose-50/20 dark:bg-rose-950/20',
                  )}
                >
                  {/* Linha Superior: Tags, Categoria, Origem, Data e Prioridade */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {renderTypeBadge(item.learning_type, isConstitution)}
                      {renderStatusBadge(item.status, item.is_active)}

                      {isSeed && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold"
                        >
                          Expert BRF
                        </Badge>
                      )}

                      {isAuto && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                        >
                          Auto Pós-Atendimento
                        </Badge>
                      )}

                      {isCron && (
                        <Badge
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                        >
                          Loop Semanal
                        </Badge>
                      )}

                      <span className="text-[10px] font-mono text-muted-foreground">
                        P{item.priority}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(item.created)}</span>
                    </div>
                  </div>

                  {/* Título e Resumo / Regra */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50/70 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                      {item.rule_text}
                    </p>
                  </div>

                  {/* Contexto do Atendimento se houver (Cliente + Imóvel) */}
                  {(item.context_customer || item.context_property || item.conflict_flag) && (
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground pt-0.5">
                      {item.context_property && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-medium">
                          <Building2 className="h-3 w-3 text-emerald-600" />
                          {item.context_property}
                        </span>
                      )}
                      {item.context_customer && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300">
                          <User className="h-3 w-3 text-indigo-500" />
                          {item.context_customer}
                        </span>
                      )}
                      {item.conflict_flag && (
                        <span className="inline-flex items-center gap-1 bg-rose-100 dark:bg-rose-950 px-1.5 py-0.5 rounded text-rose-700 dark:text-rose-300 font-medium border border-rose-300">
                          <AlertTriangle className="h-3 w-3 text-rose-600" />
                          {item.conflict_flag}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rodapé: Autor / Curador + Botões APROVAR / DESCARTAR (Mobile-First: 44px touch) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="text-[10px] text-muted-foreground flex items-center gap-2 flex-wrap">
                      <span>
                        Autor: <strong>{item.author || 'Mauro'}</strong>
                      </span>
                      {item.reviewed_by && (
                        <>
                          <span>•</span>
                          <span>
                            Revisado por: <strong>{item.reviewed_by}</strong>
                          </span>
                        </>
                      )}
                    </div>

                    {!isConstitution && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          type="button"
                          variant={
                            item.status === 'aprovado' || (item.is_active && !item.status)
                              ? 'secondary'
                              : 'default'
                          }
                          size="sm"
                          disabled={isWorking}
                          onClick={() => handleApprove(item.id, item.title)}
                          className={cn(
                            'h-8 text-xs gap-1.5 font-semibold transition-all',
                            item.status === 'aprovado'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 hover:bg-emerald-100'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white',
                          )}
                          title="Aprovar e ativar instrução no cérebro da Bia"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{item.status === 'aprovado' ? 'Aprovado' : 'Aprovar'}</span>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isWorking}
                          onClick={() => handleDiscard(item.id, item.title)}
                          className={cn(
                            'h-8 text-xs gap-1.5 font-medium transition-all',
                            item.status === 'descartado'
                              ? 'text-slate-400 border-slate-200'
                              : 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900',
                          )}
                          title="Descartar e remover instrução do cérebro"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>{item.status === 'descartado' ? 'Descartado' : 'Descartar'}</span>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <BiaTestSuiteModal open={showTestSuiteModal} onOpenChange={setShowTestSuiteModal} />
    </Card>
  )
}
