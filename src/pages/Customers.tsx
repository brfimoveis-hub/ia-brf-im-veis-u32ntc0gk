import { useEffect, useState, useRef, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn, formatPhone } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search, LayoutList, Kanban, Clock, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '@/hooks/use-toast'

export default function Customers() {
  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [customers, setCustomers] = useState<any[]>([])
  const [cadences, setCadences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { toast } = useToast()

  const observer = useRef<IntersectionObserver | null>(null)
  const lastElementRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading) return
      if (observer.current) observer.current.disconnect()
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setPage((p) => p + 1)
        }
      })
      if (node) observer.current.observe(node)
    },
    [loading, hasMore],
  )

  useEffect(() => {
    pb.collection('cadences')
      .getFullList({ sort: 'order' })
      .then((res) => setCadences(res))
      .catch(console.error)
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await pb.collection('customers').getList(page, 50, {
          sort: '-updated',
          filter: searchTerm ? `name ~ "${searchTerm}" || phone ~ "${searchTerm}"` : '',
        })
        if (page === 1) {
          setCustomers(res.items)
        } else {
          setCustomers((prev) => {
            const existingIds = new Set(prev.map((c) => c.id))
            const newItems = res.items.filter((c) => !existingIds.has(c.id))
            return [...prev, ...newItems]
          })
        }
        setHasMore(res.page < res.totalPages)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page, searchTerm])

  useRealtime('customers', (e) => {
    if (e.action === 'create') {
      setCustomers((prev) => [e.record, ...prev])
    } else if (e.action === 'update') {
      setCustomers((prev) => prev.map((c) => (c.id === e.record.id ? e.record : c)))
    } else if (e.action === 'delete') {
      setCustomers((prev) => prev.filter((c) => c.id !== e.record.id))
    }
  })

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setPage(1)
  }

  const onDragStart = (e: React.DragEvent, customerId: string) => {
    e.dataTransfer.setData('customerId', customerId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault()
    const customerId = e.dataTransfer.getData('customerId')
    if (!customerId) return

    const customer = customers.find((c) => c.id === customerId)
    if (customer?.status === targetStatus) return

    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status: targetStatus } : c)),
    )

    try {
      await pb.collection('customers').update(customerId, { status: targetStatus })
      toast({ title: 'Status atualizado', description: `O lead foi movido para ${targetStatus}` })
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  const getUrgencyColor = (urgency: number) => {
    if (urgency >= 4)
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
    if (urgency === 3)
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads & Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus leads e acompanhe o funil de vendas.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar clientes..."
              className="pl-8"
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <div className="flex items-center border rounded-md p-1 bg-muted/20">
            <Button
              variant={view === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
              className="h-8 px-2"
            >
              <LayoutList className="h-4 w-4 mr-2 hidden sm:block" />
              Lista
            </Button>
            <Button
              variant={view === 'kanban' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setView('kanban')}
              className="h-8 px-2"
            >
              <Kanban className="h-4 w-4 mr-2 hidden sm:block" />
              Kanban
            </Button>
          </div>
        </div>
      </div>

      {view === 'list' ? (
        <div className="rounded-md border bg-card flex-1 overflow-auto relative">
          <Table>
            <TableHeader className="sticky top-0 bg-background/95 backdrop-blur z-10 shadow-sm">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status (Cadência)</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Notas / Interesse</TableHead>
                <TableHead>Última Interação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c, idx) => (
                <TableRow key={c.id} ref={idx === customers.length - 1 ? lastElementRef : null}>
                  <TableCell className="font-medium">{c.name || 'Sem nome'}</TableCell>
                  <TableCell>{c.phone ? formatPhone(c.phone) : '-'}</TableCell>
                  <TableCell>{c.email || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{c.status || 'Novo'}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.urgency ? (
                      <Badge variant="outline" className={getUrgencyColor(c.urgency)}>
                        Nível {c.urgency}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={c.notes}>
                    {c.notes || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap text-sm">
                    {c.updated
                      ? format(new Date(c.updated), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                      : '-'}
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Carregando leads...
                  </TableCell>
                </TableRow>
              )}
              {!loading && customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
          <div className="flex gap-4 h-full items-start min-w-max">
            {cadences.map((cadence) => {
              const columnCustomers = customers.filter(
                (c) => c.status === cadence.title || (!c.status && cadence.title === 'Novo'),
              )
              return (
                <div
                  key={cadence.id}
                  className="flex-shrink-0 w-80 bg-muted/30 rounded-xl border flex flex-col max-h-full"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, cadence.title)}
                >
                  <div className="p-3 border-b bg-muted/50 rounded-t-xl font-semibold flex items-center justify-between">
                    <span className="truncate pr-2 text-sm" title={cadence.title}>
                      {cadence.title}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-background">
                      {columnCustomers.length}
                    </Badge>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {columnCustomers.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, c.id)}
                        className="bg-background border rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4
                            className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors"
                            title={c.name}
                          >
                            {c.name || 'Sem nome'}
                          </h4>
                          {c.urgency && c.urgency >= 4 && (
                            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                        {c.urgency ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] mb-3 font-medium',
                              getUrgencyColor(c.urgency),
                            )}
                          >
                            Urgência: {c.urgency}
                          </Badge>
                        ) : null}
                        <div
                          className="text-xs text-muted-foreground line-clamp-2 mb-3 bg-muted/30 p-2 rounded"
                          title={c.notes}
                        >
                          {c.notes || 'Nenhuma nota registrada.'}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/80 mt-auto pt-3 border-t">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {c.updated
                              ? format(new Date(c.updated), 'dd/MM', { locale: ptBR })
                              : '-'}
                          </div>
                          <span className="truncate max-w-[100px]">
                            {c.phone ? formatPhone(c.phone) : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                    {columnCustomers.length === 0 && (
                      <div className="text-center p-4 text-xs text-muted-foreground border-2 border-dashed rounded-lg border-muted">
                        Arraste leads para cá
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {(() => {
              const knownTitles = new Set(cadences.map((c) => c.title))
              const unknownCustomers = customers.filter(
                (c) => c.status && !knownTitles.has(c.status) && c.status !== 'Novo',
              )
              if (unknownCustomers.length === 0) return null
              return (
                <div
                  className="flex-shrink-0 w-80 bg-muted/20 rounded-xl border border-dashed flex flex-col max-h-full"
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, 'Outros')}
                >
                  <div className="p-3 border-b border-dashed bg-muted/30 rounded-t-xl font-semibold flex items-center justify-between text-muted-foreground">
                    <span className="text-sm">Outros Status</span>
                    <Badge variant="outline" className="text-xs">
                      {unknownCustomers.length}
                    </Badge>
                  </div>
                  <div className="p-3 overflow-y-auto flex-1 space-y-3 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted-foreground/20 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {unknownCustomers.map((c) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, c.id)}
                        className="bg-background/50 border border-dashed rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing"
                      >
                        <div className="font-medium text-sm mb-2">{c.name || 'Sem nome'}</div>
                        <Badge variant="outline" className="text-[10px] mb-3">
                          {c.status}
                        </Badge>
                        <div className="flex items-center text-[10px] text-muted-foreground/80 pt-3 border-t border-dashed">
                          <Clock className="h-3 w-3 mr-1" />
                          {c.updated ? format(new Date(c.updated), 'dd/MM', { locale: ptBR }) : '-'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
