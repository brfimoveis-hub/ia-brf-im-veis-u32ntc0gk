import { useEffect, useState } from 'react'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageCircle,
  FileText,
  MoreHorizontal,
  MoveRight,
  MoveLeft,
  Edit2,
  Phone,
  Mail,
} from 'lucide-react'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const KANBAN_COLUMNS = [
  'Novo',
  'D0 - Contato Imediato',
  'D1 - Follow up 1',
  'D2 - Follow up 2',
  'D3 - Follow up 3',
  'D4 - Follow up 4',
  'D5 - Follow up 5',
  'D6 - Follow up 6',
  'D7 - Follow up 7',
  'D8 - Follow up 8',
  'D9 - Despedida/Nutrição',
  'Fechamento',
]

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const records = await pb.collection('customers').getFullList({
        sort: '-created',
      })
      setCustomers(records)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar clientes')
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

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      await pb.collection('customers').update(id, { status: newStatus })
    } catch (err) {
      toast.error('Erro ao atualizar status do cliente')
    }
  }

  const handleUpdateCustomer = async (id: string, data: any) => {
    await pb.collection('customers').update(id, data)
  }

  // Preserve the standard columns and also display any extra status currently in use
  const activeColumns = Array.from(
    new Set([
      ...KANBAN_COLUMNS,
      ...customers.map((c) => c.status).filter((s) => s && !KANBAN_COLUMNS.includes(s)),
    ]),
  )

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col space-y-4 p-4 md:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline de Clientes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie a cadência de vendas e acompanhamentos (Kanban).
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 rounded-lg border bg-muted/10 shadow-sm">
        <div className="flex h-full gap-5 p-5 min-h-[600px]">
          {loading ? (
            <div className="flex items-center justify-center w-full">
              <span className="text-muted-foreground animate-pulse">Carregando pipeline...</span>
            </div>
          ) : (
            activeColumns.map((col) => (
              <Column
                key={col}
                title={col}
                customers={customers.filter(
                  (c) => (c.status || 'Novo') === col || (col === 'Novo' && !c.status),
                )}
                onUpdateStatus={handleUpdateStatus}
                onUpdateCustomer={handleUpdateCustomer}
                allColumns={activeColumns}
              />
            ))
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

function Column({
  title,
  customers,
  onUpdateStatus,
  onUpdateCustomer,
  allColumns,
}: {
  title: string
  customers: any[]
  onUpdateStatus: (id: string, status: string) => void
  onUpdateCustomer: (id: string, data: any) => Promise<void>
  allColumns: string[]
}) {
  return (
    <div className="flex h-full min-w-[340px] max-w-[340px] flex-col rounded-xl bg-muted/40 p-3.5 border border-border/50">
      <div className="mb-4 flex items-center justify-between px-1.5">
        <h3 className="font-semibold text-sm text-foreground/80 tracking-tight">{title}</h3>
        <span className="rounded-full bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground shadow-sm">
          {customers.length}
        </span>
      </div>
      <ScrollArea className="flex-1 -mx-1 px-1">
        <div className="flex flex-col gap-3.5 pb-4">
          {customers.map((c) => (
            <CustomerCard
              key={c.id}
              customer={c}
              onUpdateStatus={onUpdateStatus}
              onUpdateCustomer={onUpdateCustomer}
              allColumns={allColumns}
            />
          ))}
          {customers.length === 0 && (
            <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20">
              <span className="text-xs text-muted-foreground">Nenhum cliente aqui</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

function CustomerCard({
  customer,
  onUpdateStatus,
  onUpdateCustomer,
  allColumns,
}: {
  customer: any
  onUpdateStatus: (id: string, status: string) => void
  onUpdateCustomer: (id: string, data: any) => Promise<void>
  allColumns: string[]
}) {
  const formatWhatsAppLink = (phone: string) => {
    if (!phone) return '#'
    const clean = phone.replace(/\D/g, '')
    const finalPhone = clean.length <= 11 ? `55${clean}` : clean
    return `https://wa.me/${finalPhone}`
  }

  const currentIndex = allColumns.indexOf(customer.status || 'Novo')

  return (
    <Card className="group cursor-default shadow-sm hover:shadow-md transition-all duration-200 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 pr-2">
            <h4 className="text-sm font-semibold leading-tight text-foreground line-clamp-1">
              {customer.name || 'Sem Nome'}
            </h4>
            {customer.phone && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Phone className="mr-1.5 h-3 w-3" />
                {customer.phone}
              </div>
            )}
            {customer.email && (
              <div className="flex items-center text-xs text-muted-foreground">
                <Mail className="mr-1.5 h-3 w-3" />
                <span className="truncate max-w-[180px]">{customer.email}</span>
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Mover Card</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => {
                  if (currentIndex < allColumns.length - 1) {
                    onUpdateStatus(customer.id, allColumns[currentIndex + 1])
                  }
                }}
                disabled={currentIndex === allColumns.length - 1 || currentIndex === -1}
              >
                <MoveRight className="mr-2 h-4 w-4 text-muted-foreground" />
                Avançar Estágio
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (currentIndex > 0) {
                    onUpdateStatus(customer.id, allColumns[currentIndex - 1])
                  }
                }}
                disabled={currentIndex <= 0}
              >
                <MoveLeft className="mr-2 h-4 w-4 text-muted-foreground" />
                Voltar Estágio
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <EditCustomerSheet
                customer={customer}
                onUpdateCustomer={onUpdateCustomer}
                isDropdownItem
                allColumns={allColumns}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {customer.notes && (
          <div className="mt-3.5 line-clamp-2 text-xs text-muted-foreground/90 bg-muted/40 p-2.5 rounded-md border border-border/40">
            {customer.notes}
          </div>
        )}

        {/* Actions Section RESTORED */}
        <div className="mt-4 flex items-center gap-2 border-t pt-3.5">
          {customer.phone ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 border-[#25D366]/20 shadow-none"
              asChild
            >
              <a
                href={formatWhatsAppLink(customer.phone)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-8 flex-1 opacity-50 shadow-none"
              disabled
            >
              <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
              WhatsApp
            </Button>
          )}

          <EditCustomerSheet
            customer={customer}
            onUpdateCustomer={onUpdateCustomer}
            allColumns={allColumns}
          >
            <Button size="sm" variant="secondary" className="h-8 flex-1 shadow-none">
              <Edit2 className="mr-1.5 h-3.5 w-3.5" />
              Editar / Notas
            </Button>
          </EditCustomerSheet>
        </div>
      </CardContent>
    </Card>
  )
}

function EditCustomerSheet({
  customer,
  onUpdateCustomer,
  children,
  isDropdownItem = false,
  allColumns,
}: {
  customer: any
  onUpdateCustomer: (id: string, data: any) => Promise<void>
  children?: React.ReactNode
  isDropdownItem?: boolean
  allColumns: string[]
}) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: customer.name || '',
    phone: customer.phone || '',
    email: customer.email || '',
    notes: customer.notes || '',
    status: customer.status || 'Novo',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onUpdateCustomer(customer.id, formData)
      toast.success('Cliente atualizado com sucesso')
      setOpen(false)
    } catch (err) {
      toast.error('Erro ao atualizar cliente')
    } finally {
      setLoading(false)
    }
  }

  const trigger = isDropdownItem ? (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault()
        setOpen(true)
      }}
    >
      <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
      Detalhes & Anotações
    </DropdownMenuItem>
  ) : (
    children
  )

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="w-[90vw] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Ficha do Cliente</SheetTitle>
          <SheetDescription>Atualize as informações, anotações e status no funil.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estágio Atual (Funil)</Label>
            <Select
              value={formData.status}
              onValueChange={(v) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estágio..." />
              </SelectTrigger>
              <SelectContent>
                {allColumns.map((col) => (
                  <SelectItem key={col} value={col}>
                    {col}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Anotações e Histórico</Label>
            <Textarea
              id="notes"
              className="min-h-[160px] resize-y"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Descreva as interações, perfil do cliente, preferências..."
            />
          </div>
          <div className="pt-6 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
