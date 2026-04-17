import { useState, useMemo } from 'react'
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
import { Search, Plus, Upload, MoreHorizontal, Edit, Trash2, Users } from 'lucide-react'
import { CsvImportDialog } from '@/components/customers/CsvImportDialog'
import { LeadDialog } from '@/components/customers/LeadDialog'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

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

const INITIAL_LEADS = [
  {
    id: '1',
    name: 'João Silva',
    phone: '+55 11 98765-4321',
    email: 'joao@example.com',
    phaseId: 1,
    tags: ['B2B'],
    lastInteraction: 'Há 10 min',
  },
  {
    id: '2',
    name: 'Maria Oliveira',
    phone: '+55 21 91234-5678',
    email: 'maria@example.com',
    phaseId: 4,
    tags: ['Importante'],
    lastInteraction: 'Há 2h',
  },
  {
    id: '3',
    name: 'Carlos Santos',
    phone: '+55 31 99876-5432',
    email: 'carlos@example.com',
    phaseId: 6,
    tags: ['Varejo'],
    lastInteraction: 'Ontem',
  },
  {
    id: '4',
    name: 'Ana Costa',
    phone: '+55 41 98888-7777',
    email: 'ana@example.com',
    phaseId: 8,
    tags: ['Enterprise'],
    lastInteraction: 'Ontem',
  },
  {
    id: '5',
    name: 'Pedro Mendes',
    phone: '+55 51 97777-6666',
    email: 'pedro@example.com',
    phaseId: 2,
    tags: ['B2B'],
    lastInteraction: 'Há 1 dia',
  },
]

export default function Customers() {
  const [leads, setLeads] = useState(INITIAL_LEADS)
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')

  const [csvOpen, setCsvOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<any>(null)
  const { toast } = useToast()

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.includes(search) ||
        lead.email.toLowerCase().includes(search.toLowerCase())
      const matchesPhase = phaseFilter === 'all' || lead.phaseId.toString() === phaseFilter
      return matchesSearch && matchesPhase
    })
  }, [leads, search, phaseFilter])

  const handleSaveLead = (lead: any) => {
    setLeads((prev) => {
      const exists = prev.find((l) => l.id === lead.id)
      if (exists) return prev.map((l) => (l.id === lead.id ? lead : l))
      return [lead, ...prev]
    })
    toast({ title: 'Lead salvo com sucesso!' })
  }

  const handleDelete = (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id))
    toast({ title: 'Lead removido' })
  }

  const handleImport = (newLeads: any[]) => {
    setLeads((prev) => [...newLeads, ...prev])
    toast({ title: `${newLeads.length} leads importados com sucesso!` })
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
              <TableHead>Contato</TableHead>
              <TableHead>Status da Cadência</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Última Interação</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredLeads.map((lead) => {
                const phase = PHASES.find((p) => p.id === lead.phaseId)
                return (
                  <TableRow key={lead.id} className="group">
                    <TableCell className="font-medium text-secondary">{lead.name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{lead.phone}</span>
                        <span className="text-xs text-muted-foreground">{lead.email || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            'h-2.5 w-2.5 rounded-full shadow-sm shrink-0',
                            phase?.color,
                          )}
                        />
                        <span className="text-sm font-medium">{phase?.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1.5 flex-wrap">
                        {lead.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary hover:bg-primary/20 border-primary/20"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {lead.lastInteraction}
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
      <LeadDialog
        open={leadOpen}
        onOpenChange={setLeadOpen}
        onSave={handleSaveLead}
        defaultValues={editingLead}
      />
    </div>
  )
}
