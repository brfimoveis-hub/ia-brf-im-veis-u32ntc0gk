import { useState, useEffect, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import { useRemarketingSync } from '@/hooks/use-remarketing-sync'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Search, Send, Loader2, AlertCircle, StopCircle } from 'lucide-react'
import { SyncProgressTracker } from './SyncProgressTracker'
import type { Customer } from '@/services/customers'

const PRESETS = [1, 10, 50, 100, 200, 500]
const DAY_MS = 24 * 60 * 60 * 1000

export function RemarketingListTab() {
  const { user } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
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

  const filtered = customers.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || c.email_1_value || '').toLowerCase().includes(q) ||
      (c.phone || c.phone_1_value || '').toLowerCase().includes(q)
    )
  })

  const syncable = filtered.filter(
    (c) => (c.email_1_value || c.email || '').trim() || (c.phone_1_value || c.phone || '').trim(),
  )

  const availableForPreset = syncable.filter((c) => {
    if (!c.last_sent_at) return true
    return Date.now() - new Date(c.last_sent_at).getTime() > DAY_MS
  })
  const presetSource = availableForPreset.length > 0 ? availableForPreset : syncable

  const selectPreset = (n: number | 'all') => {
    const list = n === 'all' ? presetSource : presetSource.slice(0, n)
    setSelectedIds(new Set(list.map((c) => c.id)))
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSync = () => {
    const selected = customers.filter((c) => selectedIds.has(c.id))
    sync.sync(selected, 100)
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle>Sincronização por Lista</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasCredentials && (
          <div className="flex items-center gap-2 p-3 rounded-md border border-amber-500 bg-amber-500/10 text-amber-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Credenciais Meta não configuradas. Acesse as Conexões para configurar.
          </div>
        )}
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((n) => (
            <Button
              key={n}
              variant="outline"
              size="sm"
              onClick={() => selectPreset(n)}
              disabled={sync.isSyncing}
            >
              {n}
            </Button>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectPreset('all')}
            disabled={sync.isSyncing}
          >
            Tudo
          </Button>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {syncable.length} leads com contato • {availableForPreset.length} disponíveis
          </span>
          <span className="font-medium text-foreground">{selectedIds.size} selecionados</span>
        </div>
        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-2 space-y-1">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lead encontrado.</p>
            ) : (
              filtered.map((c) => {
                const hasContact =
                  !!(c.email_1_value || c.email || '').trim() ||
                  !!(c.phone_1_value || c.phone || '').trim()
                return (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-muted/30 transition-colors"
                  >
                    <Checkbox
                      checked={selectedIds.has(c.id)}
                      onCheckedChange={() => toggle(c.id)}
                      disabled={!hasContact || sync.isSyncing}
                      id={`cust-${c.id}`}
                    />
                    <Label htmlFor={`cust-${c.id}`} className="flex-1 cursor-pointer text-sm">
                      <span className="font-medium">{c.name || c.first_name || 'Sem nome'}</span>
                      {c.status && (
                        <span className="ml-2 text-xs text-muted-foreground">{c.status}</span>
                      )}
                    </Label>
                    <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                      {c.email_1_value || c.email || c.phone_1_value || c.phone || ''}
                    </span>
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
            <Button onClick={handleSync} disabled={selectedIds.size === 0 || !hasCredentials}>
              <Send className="h-4 w-4 mr-2" /> Enviar para Meta ({selectedIds.size})
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
