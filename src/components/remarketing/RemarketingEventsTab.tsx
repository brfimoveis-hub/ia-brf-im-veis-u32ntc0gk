import { useState, useEffect, useCallback, useMemo } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useRemarketingSync } from '@/hooks/use-remarketing-sync'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Send, Loader2, AlertCircle, StopCircle } from 'lucide-react'
import { SyncProgressTracker } from './SyncProgressTracker'
import { CUSTOMER_STATUSES } from '@/services/remarketing'
import type { Customer } from '@/services/customers'

export function RemarketingEventsTab() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set())
  const sync = useRemarketingSync()

  const loadCustomers = useCallback(async () => {
    try {
      const records = await pb.collection('customers').getFullList<Customer>({ sort: 'name' })
      setCustomers(records)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  useRealtime('customers', () => loadCustomers())

  const hasCredentials = !!user?.meta_pixel_id?.trim() && !!user?.meta_capi_token?.trim()

  const statusGroups = useMemo(() => {
    const groups: Record<string, Customer[]> = {}
    for (const c of customers) {
      const status = c.status || 'Sem Status'
      if (!groups[status]) groups[status] = []
      groups[status].push(c)
    }
    return groups
  }, [customers])

  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(status)) next.delete(status)
      else next.add(status)
      return next
    })
  }

  const selectedCustomers = useMemo(() => {
    const result: Customer[] = []
    for (const status of selectedStatuses) {
      const group = statusGroups[status] || []
      for (const c of group) {
        const hasContact =
          (c.email_1_value || c.email || '').trim() || (c.phone_1_value || c.phone || '').trim()
        if (hasContact) result.push(c)
      }
    }
    return result
  }, [selectedStatuses, statusGroups])

  const allStatuses = [...CUSTOMER_STATUSES, 'Sem Status']

  const handleSync = () => sync.sync(selectedCustomers, 100)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Sincronização por Eventos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasCredentials && (
          <div className="flex items-center gap-2 p-3 rounded-md border border-amber-500 bg-amber-500/10 text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Credenciais Meta não configuradas. Acesse as Conexões para configurar.
          </div>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{customers.length} leads no total</span>
          <span className="font-medium text-foreground">
            {selectedCustomers.length} selecionados para sync
          </span>
        </div>
        <ScrollArea className="h-[350px] border rounded-md">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              allStatuses.map((status) => {
                const group = statusGroups[status] || []
                if (group.length === 0) return null
                return (
                  <div
                    key={status}
                    className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/30 transition-colors border"
                  >
                    <Checkbox
                      checked={selectedStatuses.has(status)}
                      onCheckedChange={() => toggleStatus(status)}
                      disabled={sync.isSyncing}
                      id={`evt-${status}`}
                    />
                    <Label
                      htmlFor={`evt-${status}`}
                      className="flex-1 cursor-pointer text-sm font-medium"
                    >
                      {status}
                    </Label>
                    <Badge variant="secondary">{group.length}</Badge>
                  </div>
                )
              })
            )}
          </div>
        </ScrollArea>
        <SyncProgressTracker
          isSyncing={sync.isSyncing}
          progress={sync.progress}
          syncedCount={sync.syncedCount}
          failedCount={sync.failedCount}
          totalSelected={sync.totalSelected}
          status={sync.status}
        />
        <div className="flex justify-end">
          {sync.isSyncing ? (
            <Button variant="destructive" onClick={sync.stop}>
              <StopCircle className="h-4 w-4 mr-2" /> Parar
            </Button>
          ) : (
            <Button
              onClick={handleSync}
              disabled={selectedCustomers.length === 0 || !hasCredentials}
            >
              <Send className="h-4 w-4 mr-2" /> Enviar para Meta ({selectedCustomers.length})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
