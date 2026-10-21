import pb from '@/lib/pocketbase/client'

export interface CadenceAdvanceEventPayload {
  customer_id: string
  customer_name?: string
  customer_phone?: string
  previous_step: string
  new_step: string
  previous_rank: number
  new_rank: number
  timestamp?: string
}

/**
 * Registra a transição de avanço de degrau na coleção `system_logs` de forma idempotente.
 * Impede que a mesma transição seja gravada mais de uma vez em uma janela curta de 5 minutos.
 */
export async function recordCadenceStepAdvance(
  payload: CadenceAdvanceEventPayload,
  userId?: string,
): Promise<void> {
  try {
    const effectiveUserId = userId || pb.authStore.record?.id || ''
    const nowIso = new Date().toISOString()

    // Verificação de deduplicação recente (últimos 10 minutos)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString().replace('T', ' ')
    const recent = await pb.collection('system_logs').getList(1, 1, {
      filter: `type = "cadence_step_advance" && payload.customer_id = "${payload.customer_id}" && payload.new_step = "${payload.new_step}" && created >= "${tenMinutesAgo}"`,
    })

    if (recent.items.length > 0) {
      // Já registrado recentemente
      return
    }

    const message = `Cliente ${payload.customer_name || payload.customer_id} avançou do degrau ${payload.previous_step || 'inicial'} para ${payload.new_step}`

    await pb.collection('system_logs').create({
      type: 'cadence_step_advance',
      message,
      user_id: effectiveUserId,
      payload: {
        ...payload,
        recorded_at: nowIso,
      },
      details: JSON.stringify({
        customer_id: payload.customer_id,
        from: payload.previous_step,
        to: payload.new_step,
      }),
    })
  } catch (err) {
    // Falha silenciosa para não travar a UI se a rede falhar
    console.warn('[CADENCE_ADVANCE] Falha ao registrar log de avanço de cadência:', err)
  }
}

/**
 * Retorna o número de avanços de cadência registrados no dia atual (UTC / Local).
 */
export async function getTodayCadenceAdvancesCount(): Promise<number> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayIso = todayStart.toISOString().replace('T', ' ')

    const res = await pb.collection('system_logs').getList(1, 1, {
      filter: `type = "cadence_step_advance" && created >= "${todayIso}"`,
    })

    return res.totalItems
  } catch (err) {
    console.warn('[CADENCE_ADVANCE] Falha ao consultar contagem de avanços hoje:', err)
    return 0
  }
}
