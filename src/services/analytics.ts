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

const DEFAULT_METRICS: AIResponseMetrics = {
  averageResponseTimeSeconds: 0,
  totalPairs: 0,
  fastestResponseSeconds: 0,
  slowestResponseSeconds: 0,
}

const SENT_SENDERS = ['ai', 'agent', 'system']

const pad = (n: number) => String(n).padStart(2, '0')

export const getMessageVolume = async (days = 7): Promise<MessageVolumeDataPoint[]> => {
  try {
    const since = new Date()
    since.setDate(since.getDate() - (days - 1))
    since.setHours(0, 0, 0, 0)
    const sinceStr = `${since.getFullYear()}-${pad(since.getMonth() + 1)}-${pad(since.getDate())} 00:00:00`

    const result = await pb.collection('conversations').getList(1, 500, {
      filter: `created >= "${sinceStr}"`,
      sort: 'created',
      fields: 'sender,created',
    })

    const dataMap = new Map<string, { received: number; sent: number }>()
    for (let i = 0; i < days; i++) {
      const d = new Date(since)
      d.setDate(d.getDate() + i)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
      dataMap.set(key, { received: 0, sent: 0 })
    }

    for (const conv of result.items as any[]) {
      const d = new Date(conv.created)
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
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
  } catch {
    return []
  }
}

export const getAIResponseMetrics = async (): Promise<AIResponseMetrics> => {
  try {
    const result = await pb.collection('conversations').getList(1, 1000, {
      sort: 'created',
      fields: 'id,customer_id,sender,created',
    })

    const byCustomer = new Map<string, any[]>()
    for (const conv of result.items as any[]) {
      const cid = conv.customer_id
      if (!cid) continue
      if (!byCustomer.has(cid)) byCustomer.set(cid, [])
      byCustomer.get(cid)!.push(conv)
    }

    const responseTimes: number[] = []

    for (const [, convs] of byCustomer) {
      for (let i = 0; i < convs.length - 1; i++) {
        if (convs[i].sender !== 'customer') continue
        for (let j = i + 1; j < convs.length; j++) {
          if (convs[j].sender === 'ai') {
            const diff =
              (new Date(convs[j].created).getTime() - new Date(convs[i].created).getTime()) / 1000
            if (diff >= 0) responseTimes.push(diff)
            break
          }
          if (convs[j].sender === 'customer') break
        }
      }
    }

    if (responseTimes.length === 0) return DEFAULT_METRICS

    return {
      averageResponseTimeSeconds: Math.round(
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      ),
      totalPairs: responseTimes.length,
      fastestResponseSeconds: Math.round(Math.min(...responseTimes)),
      slowestResponseSeconds: Math.round(Math.max(...responseTimes)),
    }
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
