import pb from '../lib/pocketbase/client'

export interface BiaTestSuiteScenarioResult {
  indice: number
  id: string
  nome: string
  tipo: string
  entrada_simulada: string
  resposta_capturada: string
  status: 'PASSOU' | 'FALHOU'
  detalhe: string
}

export interface BiaTestSuiteResponse {
  sucesso: boolean
  versao: string
  crm_version: string
  total_cenarios: number
  aprovados: number
  reprovados: number
  duracao_ms: number
  constituicao_ativa: {
    id: string | null
    titulo: string | null
    prioridade: number | null
  }
  resultados: BiaTestSuiteScenarioResult[]
}

export async function runBiaTestSuiteV6(): Promise<BiaTestSuiteResponse> {
  return pb.send<BiaTestSuiteResponse>('/backend/v1/bia/test_suite_v6', {
    method: 'POST',
  })
}
