import { useState, useCallback, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'

export interface DashboardStats {
  leads: number
  customers: number
  cadences: number
}

export interface EmailStats {
  sent: number
  opens: number
  clicks: number
  openRate: number
  clickRate: number
}

export interface MetaStatus {
  status: string
  error: string
  pixelId: string
}

export function useDashboardData() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({ leads: 0, customers: 0, cadences: 0 })
  const [email, setEmail] = useState<EmailStats>({
    sent: 0,
    opens: 0,
    clicks: 0,
    openRate: 0,
    clickRate: 0,
  })
  const [meta, setMeta] = useState<MetaStatus>({ status: 'disconnected', error: '', pixelId: '' })
  const [loading, setLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadStats = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        pb.collection('leads').getList(1, 1, { filter: "status != 'converted'" }),
        pb.collection('customers').getList(1, 1),
        pb.collection('cadences').getList(1, 1, { filter: 'is_active = true' }),
        pb.collection('email_campaigns').getFullList(),
      ])

      const newErrors: Record<string, boolean> = {}
      const [leadsRes, customersRes, cadencesRes, campaignsRes] = results

      setStats({
        leads: leadsRes.status === 'fulfilled' ? leadsRes.value.totalItems : 0,
        customers: customersRes.status === 'fulfilled' ? customersRes.value.totalItems : 0,
        cadences: cadencesRes.status === 'fulfilled' ? cadencesRes.value.totalItems : 0,
      })

      if (leadsRes.status === 'rejected') newErrors.leads = true
      if (customersRes.status === 'rejected') newErrors.customers = true
      if (cadencesRes.status === 'rejected') newErrors.cadences = true
      if (campaignsRes.status === 'rejected') newErrors.email = true

      if (campaignsRes.status === 'fulfilled') {
        const campaigns = campaignsRes.value as any[]
        const sent = campaigns.reduce((s, c) => s + (c.success_count || 0), 0)
        const opens = campaigns.reduce((s, c) => s + (c.unique_opens || 0), 0)
        const clicks = campaigns.reduce((s, c) => s + (c.unique_clicks || 0), 0)
        setEmail({
          sent,
          opens,
          clicks,
          openRate: sent > 0 ? Math.round((opens / sent) * 100) : 0,
          clickRate: opens > 0 ? Math.round((clicks / opens) * 100) : 0,
        })
      }

      setErrors(newErrors)
    } catch {
      setErrors({ all: true })
    }
  }, [])

  const logMetaError = useCallback(async (error: unknown, userId: string) => {
    try {
      const errMessage = error instanceof Error ? error.message : String(error)
      const errStack = error instanceof Error ? error.stack : undefined
      await pb.collection('system_logs').create({
        type: 'dashboard_meta_error',
        message: `Failed to fetch Meta WhatsApp status: ${errMessage}`,
        details: {
          stack: errStack,
          user_id: userId,
          timestamp: new Date().toISOString(),
        },
      })
    } catch {
      // Silently ignore — logging must never crash the dashboard
    }
  }, [])

  const refreshMeta = useCallback(async () => {
    if (!user) return
    try {
      const usr = await pb.collection('users').getOne(user.id)
      setMeta({
        status: usr.meta_capi_status || 'disconnected',
        error: usr.meta_capi_error || '',
        pixelId: usr.meta_pixel_id || '',
      })
      setErrors((prev) => ({ ...prev, meta: false }))
    } catch (error) {
      setErrors((prev) => ({ ...prev, meta: true }))
      setMeta((prev) => ({
        ...prev,
        status: 'error',
        error: 'Failed to fetch Meta status',
      }))
      void logMetaError(error, user.id)
    }
  }, [user, logMetaError])

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([loadStats(), refreshMeta()])
    setLoading(false)
  }, [loadStats, refreshMeta])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => loadStats(), 300)
  }, [loadStats])

  useRealtime('users', () => refreshMeta())
  useRealtime('customers', debouncedRefresh)
  useRealtime('leads', debouncedRefresh)
  useRealtime('email_campaigns', debouncedRefresh)

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    },
    [],
  )

  return { stats, email, meta, loading, errors, retry: loadAll }
}
