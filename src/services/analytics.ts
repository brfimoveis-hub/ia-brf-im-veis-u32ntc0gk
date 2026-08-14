import pb from '@/lib/pocketbase/client'

export interface MessageVolumeDataPoint {
  date: string
  label: string
  received: number
  sent: number
}

export interface AIResponseMetrics {
  averageResponseTimeSeconds: number
  totalPairs: number
  fastestResponseSeconds: number
  slowestResponseSeconds: number
}

export interface AnalyticsSnapshot {
  messageVolume: MessageVolumeDataPoint[]
  aiResponseMetrics: AIResponseMetrics
}

export const DEFAULT_METRICS: AIResponseMetrics = {
  averageResponseTimeSeconds: 0,
  totalPairs: 0,
  fastestResponseSeconds: 0,
  slowestResponseSeconds: 0,
}

const SENT_SENDERS = ['ai', 'agent', 'system']

const pad = (n: number) => String(n).padStart(2, '0')

const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * Build the per-day message volume series from a flat list of conversation
 * records (already filtered to the requested window). Extracted so the same
 * fetched records can be reused for the AI response metrics.
 */
function buildMessageVolume(items: any[], since: Date, days: number): MessageVolumeDataPoint[] {
  const dataMap = new Map<string, { received: number; sent: number }>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    dataMap.set(dateKey(d), { received: 0, sent: 0 })
  }

  for (const conv of items) {
    const key = dateKey(new Date(conv.created))
    const entry = dataMap.get(key)
    if (!entry) continue
    if (conv.sender === 'customer') entry.received++
    else if (SENT_SENDERS.includes(conv.sender)) entry.sent++
  }

  return Array.from(dataMap.entries()).map(([date, counts]) => {
    const d = new Date(date + 'T00:00:00')
    return {
      date,
      label: `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`,
      received: counts.received,
      sent: counts.sent,
    }
  })
}

/**
 * Compute AI response metrics from a flat, time-sorted list of conversations.
 *
 * O(n) single pass: for each customer we keep only the most recent unanswered
 * customer message timestamp. When an AI message arrives for that customer, we
 * pair it with the pending customer timestamp, record the latency, and clear
 * the pending marker. This replaces the previous nested-loop O(n²) scan that
 * re-iterated every following message for each customer message.
 */
function buildAIResponseMetrics(items: any[]): AIResponseMetrics {
  // Map of customer_id -> timestamp (ms) of the last customer message that has
  // not yet been answered by an AI message.
  const pending = new Map<string, number>()
  let sum = 0
  let count = 0
  let min = Infinity
  let max = 0

  for (const conv of items) {
    const cid = conv.customer_id
    if (!cid) continue
    const ts = new Date(conv.created).getTime()

    if (conv.sender === 'customer') {
      // Remember/overwrite the pending customer message for this customer.
      pending.set(cid, ts)
      continue
    }

    if (conv.sender === 'ai') {
      const customerTs = pending.get(cid)
      if (customerTs === undefined) continue
      const diff = (ts - customerTs) / 1000
      if (diff >= 0) {
        sum += diff
        count++
        if (diff < min) min = diff
        if (diff > max) max = diff
      }
      // AI answered — clear the pending marker so a later AI message does not
      // pair again with the same customer message.
      pending.delete(cid)
    }
  }

  if (count === 0) return DEFAULT_METRICS
  return {
    averageResponseTimeSeconds: Math.round(sum / count),
    totalPairs: count,
    fastestResponseSeconds: Math.round(min),
    slowestResponseSeconds: Math.round(max),
  }
}

/**
 * Single fetch that serves both the message-volume chart and the AI response
 * metrics card. Replaces the previous pattern of two independent calls (each
 * pulling 500-1000 conversation records) firing in parallel on dashboard mount.
 *
 * We fetch the longer of the two windows once, in one request, then derive
 * both metrics client-side from that same record set. The AI metrics pass is
 * O(n) (see buildAIResponseMetrics).
 */
export const getAnalyticsSnapshot = async (days = 7): Promise<AnalyticsSnapshot> => {
  try {
    const since = new Date()
    since.setDate(since.getDate() - (days - 1))
    since.setHours(0, 0, 0, 0)
    const sinceStr = `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())} 00:00:00`

    const result = await pb.collection('conversations').getList(1, 1000, {
      filter: `created >= "${sinceStr}"`,
      sort: 'created',
      fields: 'id,customer_id,sender,created',
    })

    const items = result.items as any[]

    return {
      messageVolume: buildMessageVolume(items, since, days),
      aiResponseMetrics: buildAIResponseMetrics(items),
    }
  } catch {
    return {
      messageVolume: [],
      aiResponseMetrics: DEFAULT_METRICS,
    }
  }
}

// Kept for backwards compatibility with any caller that only needs one half.
export const getMessageVolume = async (days = 7): Promise<MessageVolumeDataPoint[]> => {
  return (await getAnalyticsSnapshot(days)).messageVolume
}

// Kept for backwards compatibility. Note: this still fetches its own list, so
// prefer getAnalyticsSnapshot when both metrics are needed.
export const getAIResponseMetrics = async (): Promise<AIResponseMetrics> => {
  try {
    const result = await pb.collection('conversations').getList(1, 1000, {
      sort: 'created',
      fields: 'id,customer_id,sender,created',
    })
    return buildAIResponseMetrics(result.items as any[])
  } catch {
    return DEFAULT_METRICS
  }
}

export const formatResponseTime = (seconds: number): string => {
  if (seconds <= 0) return '—'
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}m ${secs}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}
