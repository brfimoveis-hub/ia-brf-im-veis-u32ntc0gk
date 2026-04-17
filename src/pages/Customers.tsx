import { useState, useMemo, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Search, Plus, Upload, MoreHorizontal, Edit, Trash2, Users, Loader2 } from 'lucide-react'
import { CsvImportDialog } from '@/components/customers/CsvImportDialog'
import { LeadDialog } from '@/components/customers/LeadDialog'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { getCustomers, deleteCustomer, createCustomer, Customer } from '@/services/customers'
import { useRealtime } from '@/hooks/use-realtime'

const PHASES = [
  { id: 1, title: 'Lead Novo', color: 'bg-slate-500' },
  { id: 2, title: 'Contato 1', color: 'bg-blue-400' },
  { id: 3, title: 'Contato 2', color: 'bg-blue-500' },
  { id: 4, title: 'Qualificação', color: 'bg-indigo-400' },
  { id: 5, title: 'Qualificado', color: 'bg-indigo-500' },
  { id: 6, title: 'Demo Agend.', color: 'bg-purple-500' },
  { id: 7, title: 'Demo Realiz.', color: 'bg-purple-600' },
  { id: 8, title: 'Proposta', color: 'bg-amber-500' },
  { id: 9, title: 'Negociação', color: 'bg-orange-500' },
  { id: 10, title: 'Fechamento', color: 'bg-green-500' },
]

const formatPhone = (phone?: string) => {
  if (!phone) return '—'
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.substring(2)
  }
  if (cleaned.length === 11) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6, 10)}`
  }
  return phone
}

export default function Customers() {
  const [leads, setLeads] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const [csvOpen, setCsvOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Customer | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await getCustomers()
      setLeads(data)
    } catch (err) {
      toast({ title: 'Erro ao carregar clientes', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', () => {
    loadData()
  })

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        (lead.phone && lead.phone.includes(search)) ||
        (lead.email && lead.email.toLowerCase().includes(search.toLowerCase()))
      const matchesPhase = phaseFilter === 'all' || lead.status === phaseFilter
      return matchesSearch && matchesPhase
    })
  }, [leads, search, phaseFilter])

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Lead removido' })
    } catch (err) {
      toast({ title: 'Erro ao remover lead', variant: 'destructive' })
    }
  }

  const handleImport = async (newLeads: any[]) => {
    let successCount = 0
    for (const lead of newLeads) {
      try {
        await createCustomer({
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          status: '1',
          tags: ['Importado'],
        })
        successCount++
      } catch (err) {
        console.error('Error importing lead', err)
      }
    }
    if (successCount > 0) {
      toast({ title: `${successCount} leads importados com sucesso!` })
    } else {
      toast({ title: 'Nenhum lead importado', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Base de Clientes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus leads, importe listas e acompanhe o status nas cadências.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setCsvOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button
            onClick={() => {
              setEditingLead(null)
              setLeadOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Adicionar Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por fase" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as fases</SelectItem>
            {PHASES.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>
                {p.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-xl bg-card shadow-sm flex-1 overflow-auto">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Fase/Status</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => {
                const phase = PHASES.find((p) => p.id.toString() === lead.status)
                return (
                  <TableRow key={lead.id} className="group">
                    <TableCell className="font-medium text-secondary">{lead.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.email || '—'}
                    </TableCell>
                    <TableCell className="text-sm">{formatPhone(lead.phone)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-white hover:opacity-90',
                          phase?.color || 'bg-slate-500',
                        )}
                      >
                        {phase?.title || 'Desconhecido'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {(lead.tags || []).map((tag, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingLead(lead)
                              setLeadOpen(true)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(lead.id)}
                            className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImport={handleImport} />
      <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultValues={editingLead} />
    </div>
  )
}
