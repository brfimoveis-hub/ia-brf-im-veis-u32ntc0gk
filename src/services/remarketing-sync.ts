import pb from '@/lib/pocketbase/client'

export interface SyncPayload {
  id: string
  name: string
  em?: string
  ph?: string
}

export interface SyncResult {
  success: boolean
  synced: number
  message: string
}

export function syncRemarketing(
  payloads: SyncPayload[],
  eventName: string = 'Lead',
): Promise<SyncResult> {
  return pb.send('/backend/v1/meta-remarketing-sync', {
    method: 'POST',
    body: JSON.stringify({ payloads, eventName }),
    headers: { 'Content-Type': 'application/json' },
  })
}
