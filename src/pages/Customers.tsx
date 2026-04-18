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
import { Card, CardContent } from '@/components/ui/card'
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

const COLUMNS = [
  { key: 'name', label: 'Nome Completo' },
  { key: 'email_1_value', label: 'E-mail Principal' },
  { key: 'phone_1_value', label: 'Telefone Principal' },
  { key: 'org_name', label: 'Organização' },
  { key: 'tags', label: 'Labels/Tags' },
  { key: 'first_name', label: 'First Name' },
  { key: 'middle_name', label: 'Middle Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'phonetic_first_name', label: 'Phonetic First Name' },
  { key: 'phonetic_middle_name', label: 'Phonetic Middle Name' },
  { key: 'phonetic_last_name', label: 'Phonetic Last Name' },
  { key: 'name_prefix', label: 'Name Prefix' },
  { key: 'name_suffix', label: 'Name Suffix' },
  { key: 'nickname', label: 'Nickname' },
  { key: 'file_as', label: 'File As' },
  { key: 'org_title', label: 'Organization Title' },
  { key: 'org_dept', label: 'Organization Department' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'notes', label: 'Notes' },
  { key: 'photo', label: 'Photo' },
  { key: 'email_1_label', label: 'E-mail 1 - Label' },
  { key: 'email_2_label', label: 'E-mail 2 - Label' },
  { key: 'email_2_value', label: 'E-mail 2 - Value' },
  { key: 'phone_1_label', label: 'Phone 1 - Label' },
  { key: 'phone_2_label', label: 'Phone 2 - Label' },
  { key: 'phone_2_value', label: 'Phone 2 - Value' },
  { key: 'phone_3_label', label: 'Phone 3 - Label' },
  { key: 'phone_3_value', label: 'Phone 3 - Value' },
  { key: 'phone_4_label', label: 'Phone 4 - Label' },
  { key: 'phone_4_value', label: 'Phone 4 - Value' },
  { key: 'address_1_label', label: 'Address 1 - Label' },
  { key: 'address_1_formatted', label: 'Address 1 - Formatted' },
  { key: 'address_1_street', label: 'Address 1 - Street' },
  { key: 'address_1_city', label: 'Address 1 - City' },
  { key: 'address_1_po_box', label: 'Address 1 - PO Box' },
  { key: 'address_1_region', label: 'Address 1 - Region' },
  { key: 'address_1_postal_code', label: 'Address 1 - Postal Code' },
  { key: 'address_1_country', label: 'Address 1 - Country' },
  { key: 'address_1_extended', label: 'Address 1 - Extended Address' },
  { key: 'website_1_label', label: 'Website 1 - Label' },
  { key: 'website_1_value', label: 'Website 1 - Value' },
]

export default function Customers() {
  const [leads, setLeads] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const [csvOpen, setCsvOpen] = useState(false)
  const [leadOpen, setLeadOpen] = useState(false)
  const [importing, setImporting] = useState(false)
  const [editingLead, setEditingLead] = useState<Customer | null>(null)
  const { toast } = useToast()

  const loadData = async () => {
    try {
      const data = await getCustomers()
      setLeads(data)
    } catch {
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
      const matchSearch =
        (lead.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (lead.phone_1_value || '').includes(search) ||
        (lead.email_1_value || '').toLowerCase().includes(search.toLowerCase())
      const matchPhase = phaseFilter === 'all' || lead.status === phaseFilter
      return matchSearch && matchPhase
    })
  }, [leads, search, phaseFilter])

  const handleDelete = async (id: string) => {
    try {
      await deleteCustomer(id)
      toast({ title: 'Lead removido' })
    } catch {
      toast({ title: 'Erro', variant: 'destructive' })
    }
  }

  const handleImport = async (newLeads: any[]) => {
    setImporting(true)
    let successCount = 0

    const batchSize = 50
    for (let i = 0; i < newLeads.length; i += batchSize) {
      const batch = newLeads.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (lead) => {
          try {
            const nameParts = [lead.first_name, lead.middle_name, lead.last_name].filter(Boolean)
            const fullName = nameParts.length > 0 ? nameParts.join(' ') : 'Contato Sem Nome'

            let tags: string[] = []
            if (lead.tags) {
              tags =
                typeof lead.tags === 'string' ? lead.tags.split(' ::: ').filter(Boolean) : lead.tags
            } else {
              tags = ['Importado']
            }

            let status = '1'
            const possiblePhaseTitle = tags.find((t: string) =>
              PHASES.some((p) => p.title.toLowerCase() === t.toLowerCase()),
            )
            if (possiblePhaseTitle) {
              const matchedPhase = PHASES.find(
                (p) => p.title.toLowerCase() === possiblePhaseTitle.toLowerCase(),
              )
              if (matchedPhase) status = matchedPhase.id.toString()
            }

            const payload = {
              ...lead,
              name: fullName,
              email: lead.email_1_value || lead.email,
              phone: lead.phone_1_value || lead.phone,
              status,
              tags,
            }
            await createCustomer(payload)
            successCount++
          } catch (error) {
            console.error('Erro ao importar lead', error)
          }
        }),
      )
    }

    setImporting(false)
    toast({
      title:
        successCount > 0
          ? `${successCount} contatos importados com sucesso!`
          : 'Falha na importação',
      description:
        successCount === 0 ? 'Nenhum contato foi importado devido a um erro.' : undefined,
      variant: successCount > 0 ? 'default' : 'destructive',
    })
    loadData()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] gap-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-secondary flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Base de Clientes
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie seus leads e contatos importados do Google Contacts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setCsvOpen(true)}
            disabled={importing}
            className="gap-2"
          >
            {importing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {importing ? 'Importando...' : 'Importar'}
          </Button>
          <Button
            onClick={() => {
              setEditingLead(null)
              setLeadOpen(true)
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 shrink-0">
        <div className="relative flex-1 w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar contatos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 w-full"
          />
        </div>
        <Select value={phaseFilter} onValueChange={setPhaseFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Fase" />
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

      <Card className="flex-1 flex flex-col overflow-hidden shadow-sm">
        <CardContent className="p-0 flex-1 overflow-x-auto">
          <Table className="w-full">
            <TableHeader className="bg-muted sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="whitespace-nowrap font-semibold">Fase/Status</TableHead>
                {COLUMNS.map((col) => (
                  <TableHead key={col.key} className="whitespace-nowrap">
                    {col.label}
                  </TableHead>
                ))}
                <TableHead className="w-[50px] sticky right-0 bg-muted"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length + 2} className="h-32 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={COLUMNS.length + 2}
                    className="h-32 text-center text-muted-foreground"
                  >
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const phase = PHASES.find((p) => p.id.toString() === lead.status)
                  return (
                    <TableRow key={lead.id} className="group hover:bg-muted/50">
                      <TableCell className="whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className={cn('text-white', phase?.color || 'bg-slate-500')}
                        >
                          {phase?.title || 'Desconhecido'}
                        </Badge>
                      </TableCell>
                      {COLUMNS.map((col) => {
                        if (col.key === 'tags') {
                          return (
                            <TableCell key={col.key} className="whitespace-nowrap">
                              <div className="flex gap-1">
                                {(lead.tags || []).map((t, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                          )
                        }
                        let val = (lead as any)[col.key]
                        if (col.key === 'name' && !val) {
                          val =
                            [lead.first_name, lead.middle_name, lead.last_name]
                              .filter(Boolean)
                              .join(' ') || '—'
                        }

                        return (
                          <TableCell
                            key={col.key}
                            className={cn(
                              'whitespace-nowrap text-sm text-muted-foreground',
                              col.key === 'name' && 'font-medium text-foreground',
                            )}
                          >
                            {val || '—'}
                          </TableCell>
                        )
                      })}
                      <TableCell className="sticky right-0 bg-background group-hover:bg-muted/50 border-l">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
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
                              className="text-destructive"
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
        </CardContent>
      </Card>

      {csvOpen && (
        <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} onImport={handleImport} />
      )}
      {leadOpen && (
        <LeadDialog open={leadOpen} onOpenChange={setLeadOpen} defaultValues={editingLead} />
      )}
    </div>
  )
}
