import { useState, useEffect, useCallback, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  parseMovementMapStages,
  extractStageNumber,
  type StageParsedInstruction,
} from '@/lib/bia-movement-parser'

export interface BiaMovementInstructionsState {
  stages: Record<number, StageParsedInstruction>
  loading: boolean
  error: string | null
  sourceRecordId: string | null
  lastUpdated: string | null
  reload: () => Promise<void>
}

// Cache em memória para evitar refetch repetido a cada render
let cachedStages: Record<number, StageParsedInstruction> | null = null
let cachedRecordId: string | null = null
let cachedTimestamp: number = 0
const CACHE_TTL_MS = 60 * 1000 // 1 minuto

/**
 * Busca o Texto Único da Bia ativo (priorizando o id soberano tYVJIdIFb5rW4iq ou o de maior prioridade ativa)
 */
export async function fetchBiaMovementMap(): Promise<{
  stages: Record<number, StageParsedInstruction>
  recordId: string | null
  updatedAt: string | null
}> {
  // 1. Tenta carregar o registro canônico por ID
  let learningRecord: any = null
  try {
    learningRecord = await pb.collection('bia_learnings').getOne('tYVJIdIFb5rW4iq')
  } catch {
    learningRecord = null
  }

  // 2. Se não achou por ID direto, busca o registro ativo de maior prioridade
  if (!learningRecord) {
    try {
      const records = await pb.collection('bia_learnings').getList(1, 1, {
        filter: 'is_active = true',
        sort: '-priority,-created',
      })
      if (records.items.length > 0) {
        learningRecord = records.items[0]
      }
    } catch (err) {
      console.warn('[useBiaMovementInstructions] Falha ao consultar bia_learnings:', err)
    }
  }

  // 3. Fallback: users.bia_instructions do usuário autenticado
  let ruleText = learningRecord?.rule_text || ''
  if (!ruleText && pb.authStore.record) {
    ruleText = (pb.authStore.record as any).bia_instructions || ''
  }

  const stages = parseMovementMapStages(ruleText)
  cachedStages = stages
  cachedRecordId = learningRecord?.id || null
  cachedTimestamp = Date.now()

  return {
    stages,
    recordId: learningRecord?.id || null,
    updatedAt: learningRecord?.updated || null,
  }
}

/**
 * Hook para acessar as instruções dos 10 estágios em tempo real e com fallback tolerante.
 * Também ouve alterações no PocketBase (realtime na coleção bia_learnings) para que
 * se o Mauro editar o Texto Único no Caderno de Aprendizados, a interface do Pipeline atualize sozinha!
 */
export function useBiaMovementInstructions(): BiaMovementInstructionsState {
  const [stages, setStages] = useState<Record<number, StageParsedInstruction>>(() => {
    return cachedStages || parseMovementMapStages('')
  })
  const [loading, setLoading] = useState<boolean>(!cachedStages)
  const [error, setError] = useState<string | null>(null)
  const [sourceRecordId, setSourceRecordId] = useState<string | null>(cachedRecordId)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const load = useCallback(async (force = false) => {
    if (!force && cachedStages && Date.now() - cachedTimestamp < CACHE_TTL_MS) {
      setStages(cachedStages)
      setSourceRecordId(cachedRecordId)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const res = await fetchBiaMovementMap()
      if (!isMountedRef.current) return
      setStages(res.stages)
      setSourceRecordId(res.recordId)
      setLastUpdated(res.updatedAt)
    } catch (err: any) {
      if (!isMountedRef.current) return
      console.warn('[useBiaMovementInstructions] Erro ao carregar instruções:', err)
      setError(err?.message || 'Não foi possível carregar as instruções da Bia')
      // Mantém fallback ativo
      setStages(parseMovementMapStages(''))
    } finally {
      if (isMountedRef.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    load()

    // Inscrição Realtime na coleção bia_learnings para recarregar se o Mauro atualizar o Texto Único
    let unsubscribed = false
    const setupRealtime = async () => {
      try {
        await pb.collection('bia_learnings').subscribe('*', (e) => {
          if (unsubscribed) return
          // Se qualquer aprendizado for criado/atualizado/deletado, invalida cache e recarrega
          if (e.action === 'update' || e.action === 'create' || e.action === 'delete') {
            cachedStages = null
            load(true)
          }
        })
      } catch (subErr) {
        // Falha no realtime não é impeditiva (fallback polling/manual)
        console.warn(
          '[useBiaMovementInstructions] Realtime indisponível para bia_learnings:',
          subErr,
        )
      }
    }

    setupRealtime()

    return () => {
      unsubscribed = true
      isMountedRef.current = false
      try {
        pb.collection('bia_learnings').unsubscribe('*')
      } catch {
        /* intentionally ignored */
      }
    }
  }, [load])

  return {
    stages,
    loading,
    error,
    sourceRecordId,
    lastUpdated,
    reload: () => load(true),
  }
}

/**
 * Helper para obter a instrução de um estágio a partir de seu identificador
 */
export function getStageInstruction(
  stages: Record<number, StageParsedInstruction>,
  stageIdentifier: string | number,
): StageParsedInstruction | null {
  const num = extractStageNumber(stageIdentifier)
  if (!num) return null
  return stages[num] || null
}
