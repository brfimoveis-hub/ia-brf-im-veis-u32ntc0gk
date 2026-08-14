import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageVolumeChart } from '@/components/dashboard/message-volume-chart'
import { AIResponseMetricsCard } from '@/components/dashboard/ai-response-metrics'
import { useDashboardRealtimeEvent } from '@/components/dashboard/dashboard-realtime'
import {
  getAnalyticsSnapshot,
  DEFAULT_METRICS,
  type MessageVolumeDataPoint,
  type AIResponseMetrics,
} from '@/services/analytics'

/**
 * The analytics section (message-volume chart + AI response metrics) is the
 * heaviest part of the dashboard: each card used to fire its own 500-1000-row
 * conversation fetch on mount, and both fired in parallel at the same instant.
 *
 * This wrapper:
 *  - defers the fetch until the section scrolls into view (IntersectionObserver),
 *  - performs a SINGLE fetch (getAnalyticsSnapshot) that derives both metrics,
 *  - collapses bursty realtime `conversations` events into one debounced refresh.
 */
export function PerformanceDashboard() {
  const [volume, setVolume] = useState<MessageVolumeDataPoint[]>([])
  const [metrics, setMetrics] = useState<AIResponseMetrics>(DEFAULT_METRICS)
  const [period, setPeriod] = useState<'7' | '14'>('7')
  const [loading, setLoading] = useState(true)

  const sectionRef = useRef<HTMLDivElement | null>(null)
  // Has the section scrolled into view at least once? The analytics fetch only
  // runs after this flips true.
  const [visible, setVisible] = useState(false)

  // Observe the section; once it enters the viewport, mark it visible forever
  // (we never unmount the analytics after that — only refresh on demand).
  useEffect(() => {
    const el = sectionRef.current
    if (!el || visible) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [visible])

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const snapshot = await getAnalyticsSnapshot(parseInt(period))
      setVolume(snapshot.messageVolume)
      setMetrics(snapshot.aiResponseMetrics)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [period])

  // Initial + period-change fetch — but ONLY after the section is visible.
  useEffect(() => {
    if (!visible) return
    fetchAnalytics()
  }, [visible, fetchAnalytics])

  // Shared dashboard subscription (same channel as the rest of the page), so a
  // conversation event triggers ONE debounced refresh of both analytics cards.
  useDashboardRealtimeEvent('conversations', () => {
    fetchAnalytics()
  })

  return (
    <div ref={sectionRef} className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold tracking-tight">Performance Dashboard</h3>
        <p className="text-sm text-muted-foreground">
          Monitoramento de volume e eficiência da IA em tempo real.
        </p>
      </div>
      {!visible ? (
        // Lightweight placeholder while the section is below the fold: no data,
        // no fetch, no chart mount.
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-4 lg:col-span-3 h-[380px] rounded-xl border bg-muted/20" />
          <div className="col-span-4 lg:col-span-1 h-[380px] rounded-xl border bg-muted/20" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="col-span-4 lg:col-span-3">
            <MessageVolumeChart
              data={volume}
              period={period}
              onPeriodChange={setPeriod}
              loading={loading}
            />
          </div>
          <div className="col-span-4 lg:col-span-1">
            <AIResponseMetricsCard metrics={metrics} loading={loading} />
          </div>
        </div>
      )}
    </div>
  )
}
