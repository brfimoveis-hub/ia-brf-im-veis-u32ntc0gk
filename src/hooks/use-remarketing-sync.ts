import { useState, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { syncRemarketing, type Customer } from '@/services/customers'
import pb from '@/lib/pocketbase/client'

interface SyncState {
  isSyncing: boolean
  progress: number
  syncedCount: number
  failedCount: number
  totalSelected: number
  status: 'idle' | 'syncing' | 'success' | 'error'
}

const INITIAL_STATE: SyncState = {
  isSyncing: false,
  progress: 0,
  syncedCount: 0,
  failedCount: 0,
  totalSelected: 0,
  status: 'idle',
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function formatPhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9]/g, '')
  if (cleaned.length === 10 || cleaned.length === 11) {
    cleaned = '55' + cleaned
  }
  return cleaned
}

export function useRemarketingSync() {
  const { toast } = useToast()
  const [state, setState] = useState<SyncState>(INITIAL_STATE)
  const isStoppedRef = useRef(false)

  const sync = useCallback(
    async (customers: Customer[], batchSize = 100) => {
      if (customers.length === 0) return

      isStoppedRef.current = false
      setState({
        ...INITIAL_STATE,
        isSyncing: true,
        totalSelected: customers.length,
        status: 'syncing',
      })

      let synced = 0
      let failed = 0
      const batch = Math.max(1, batchSize)

      for (let i = 0; i < customers.length; i += batch) {
        if (isStoppedRef.current) break

        const chunk = customers.slice(i, i + batch)
        const payloads = await Promise.all(
          chunk.map(async (c) => {
            const email = (c.email_1_value || c.email || '').trim().toLowerCase()
            const phone = formatPhone(c.phone_1_value || c.phone || '')
            return {
              id: c.id,
              name: c.name || c.first_name || 'Sem nome',
              em: email ? await sha256(email) : undefined,
              ph: phone ? await sha256(phone) : undefined,
            }
          }),
        )

        try {
          await syncRemarketing(payloads, '', 'Lead', batch, 0)
          synced += chunk.length
          const now = new Date().toISOString()
          await Promise.all(
            chunk.map((c) =>
              pb
                .collection('customers')
                .update(c.id, { last_sent_at: now })
                .catch(() => {}),
            ),
          )
        } catch {
          failed += chunk.length
        }

        setState((prev) => ({
          ...prev,
          syncedCount: synced,
          failedCount: failed,
          progress: Math.min(100, Math.round(((i + chunk.length) / customers.length) * 100)),
        }))
      }

      const wasStopped = isStoppedRef.current
      const allFailed = synced === 0 && failed > 0
      const partial = synced > 0 && failed > 0

      setState((prev) => ({
        ...prev,
        isSyncing: false,
        status: wasStopped ? 'idle' : allFailed ? 'error' : 'success',
      }))

      if (!wasStopped) {
        if (!allFailed && !partial) {
          toast({
            title: 'Envio concluído',
            description: `${synced} leads enviados para o Meta.`,
          })
        } else if (partial) {
          toast({
            title: 'Envio parcial',
            description: `${synced} enviados, ${failed} com falha.`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Falha no envio',
            description: 'Nenhum lead pôde ser enviado para o Meta.',
            variant: 'destructive',
          })
        }
      }
    },
    [toast],
  )

  const stop = useCallback(() => {
    isStoppedRef.current = true
  }, [])

  const reset = useCallback(() => setState(INITIAL_STATE), [])

  return { ...state, sync, stop, reset }
}
