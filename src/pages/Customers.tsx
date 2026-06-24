import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  Filter,
  MessageSquare,
  Phone,
  Mail,
  MoreHorizontal,
  LayoutList,
  Kanban,
  Clock,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { cn, formatPhone } from '@/lib/utils'

export const KANBAN_COLUMNS = [
  'Captura + Identificação',
  'Validação no CRM',
  'Contato Personalizado',
  'Mapeamento de Perfil',
  'Nutrição Automática',
  'Agendamento de Visita',
  'Pré-Visita',
  'Pós-Visita',
  'Proposta e Negociação',
  'Fechamento e Pós-Venda',
]

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'list' | 'kanban'>('list')

  const fetchCustomers = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-updated',
        filter: search ? `name ~ "${search}" || phone ~ "${search}"` : '',
      })
      setCustomers(records)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [search])

  useRealtime('customers', (e) => {
    fetchCustomers()
  })

  const updateCustomerStatus = async (id: string, newStatus: string) => {
    try {
      setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)))
      await pb.collection('customers').update(id, { status: newStatus })
    } catch (err) {
      fetchCustomers()
    }
  }

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('customerId', id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, status: string) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('customerId')
    if (id) {
      updateCustomerStatus(id, status)
    }
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-8 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clientes e Leads</h1>
          <p className="text-muted-foreground">Gerencie sua base e o funil de vendas</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs
            value={view}
            onValueChange={(v) => setView(v as 'list' | 'kanban')}
            className="w-full sm:w-auto"
          >
            <TabsList>
              <TabsTrigger value="list" className="gap-2">
                <LayoutList className="h-4 w-4" />
                <span className="hidden sm:inline">Lista</span>
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-2">
                <Kanban className="h-4 w-4" />
                <span className="hidden sm:inline">Pipeline</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-r-transparent"></div>
        </div>
      ) : view === 'list' ? (
        <Card className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/90 backdrop-blur">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name || 'Sem nome'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {formatPhone(c.phone || '') || 'N/A'}
                        </span>
                        {c.email && (
                          <span className="flex items-center gap-1 text-muted-foreground mt-1">
                            <Mail className="h-3 w-3" /> {c.email}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="whitespace-nowrap">
                        {c.status || 'Novo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.urgency ? (
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full',
                              c.urgency >= 4
                                ? 'bg-red-500'
                                : c.urgency >= 3
                                  ? 'bg-orange-500'
                                  : 'bg-green-500',
                            )}
                          />
                          <span>{c.urgency}/5</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(c.updated).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {customers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
            <ScrollBar orientation="vertical" />
          </ScrollArea>
        </Card>
      ) : (
        <ScrollArea className="flex-1 rounded-md border bg-muted/20">
          <div className="flex h-full gap-4 p-4 min-w-max pb-8">
            {KANBAN_COLUMNS.map((col) => {
              const colCustomers = customers.filter(
                (c) =>
                  c.status === col ||
                  (!c.status && col === 'Captura + Identificação') ||
                  (col === 'Captura + Identificação' && !KANBAN_COLUMNS.includes(c.status)),
              )

              return (
                <div
                  key={col}
                  className="flex h-full w-80 flex-col gap-3 rounded-lg bg-muted/50 p-3 shrink-0"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col)}
                >
                  <div className="flex items-center justify-between px-1 shrink-0">
                    <h3 className="font-semibold text-sm line-clamp-1 flex-1" title={col}>
                      {col}
                    </h3>
                    <Badge variant="secondary" className="ml-2">
                      {colCustomers.length}
                    </Badge>
                  </div>
                  <ScrollArea className="flex-1 -mx-3 px-3">
                    <div className="flex flex-col gap-2 pb-4">
                      {colCustomers.map((c) => (
                        <Card
                          key={c.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, c.id)}
                          className="cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
                        >
                          <CardContent className="p-3 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-medium text-sm line-clamp-1">
                                {c.name || 'Sem nome'}
                              </span>
                              <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0 cursor-grab active:cursor-grabbing" />
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-col gap-1">
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />{' '}
                                {formatPhone(c.phone || '') || 'Sem telefone'}
                              </span>
                              {c.urgency ? (
                                <span className="flex items-center gap-1 mt-1">
                                  <span
                                    className={cn(
                                      'h-2 w-2 rounded-full',
                                      c.urgency >= 4
                                        ? 'bg-red-500'
                                        : c.urgency >= 3
                                          ? 'bg-orange-500'
                                          : 'bg-green-500',
                                    )}
                                  />
                                  Urgência: {c.urgency}/5
                                </span>
                              ) : null}
                              <span className="flex items-center gap-1 mt-1">
                                <Clock className="h-3 w-3" />
                                {new Date(c.updated).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}
    </div>
  )
}
