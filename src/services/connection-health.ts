import pb from '@/lib/pocketbase/client'

export interface ConnectionHealthResult {
  name: string
  key: string
  status: 'connected' | 'error' | 'warning' | 'not_configured'
  timestamp: string
  message: string
  details?: Record<string, any>
}

export interface HealthCheckResponse {
  success: boolean
  results: ConnectionHealthResult[]
  timestamp: string
  error?: string
}

export const runHealthCheck = async (connection?: string): Promise<HealthCheckResponse> => {
  return pb.send('/backend/v1/connection_health_check', {
    method: 'POST',
    body: JSON.stringify(connection ? { connection } : {}),
    headers: { 'Content-Type': 'application/json' },
  })
}
