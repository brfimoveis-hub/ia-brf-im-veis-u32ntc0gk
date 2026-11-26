/**
 * MAESTRO — Ciclo de Valor da Bia (bia_maestro_insights).
 * Serviço do painel em /configuracoes: leitura dos insights (rota GET
 * /backend/v1/maestro_insights) e disparo manual do ciclo (POST
 * /backend/v1/maestro_run). Ambas as rotas exigem sessão do painel.
 */
import pb from '@/lib/pocketbase/client'

export interface MaestroLearning {
  tipo?: string
  texto?: string
}

export interface MaestroMetrics {
  mensagens_clientes?: number
  respostas_bia?: number
  sem_resposta?: number
  clientes_ativos?: number
  imoveis_ativos?: number
  arquivos_conhecimento?: number
}

export interface MaestroInsight {
  id: string
  ciclo: string
  status: 'ok' | 'error'
  resumo: string
  learnings: MaestroLearning[]
  metrics: MaestroMetrics
  error: string
  created: string
}

export interface MaestroInsightsResponse {
  insights: MaestroInsight[]
  error?: string
}

export interface MaestroRunOutcome {
  ok: boolean
  ciclo: string
  insightId: string
  status: 'ok' | 'already_ran_today' | 'error_logged'
  error: string
  trigger: 'cron' | 'manual'
}

export interface MaestroRunResponse {
  success: boolean
  outcome?: MaestroRunOutcome
  error?: string
}

export const getMaestroInsights = async (): Promise<MaestroInsight[]> => {
  const res = await pb.send<MaestroInsightsResponse>('/backend/v1/maestro_insights', {
    method: 'GET',
  })
  return Array.isArray(res?.insights) ? res.insights : []
}

export const runMaestroCycle = async (): Promise<MaestroRunResponse> => {
  return pb.send<MaestroRunResponse>('/backend/v1/maestro_run', {
    method: 'POST',
  })
}

export const TIPO_LABELS: Record<string, string> = {
  demanda_nao_resolvida: 'Demanda não resolvida',
  pergunta_repetida: 'Pergunta repetida',
  erro_repetido: 'Erro repetido',
  oportunidade: 'Oportunidade',
  objecao: 'Objeção',
}
