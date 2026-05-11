import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { MoreHorizontal, Edit, Trash2, AlertCircle, RefreshCw } from 'lucide-react'
import { Customer } from '@/services/customers'
import { PHASES, COLUMNS } from './constants'
import { cn, formatPhone } from '@/lib/utils'
import { useSearchParams } from 'react-router-dom'
import { RemarketingSyncModal } from './RemarketingSyncModal'
import { useState } from 'react'
import { CustomerDetailDrawer } from './CustomerDetailDrawer'

interface CustomerTableProps {
  leads: Customer[]
  loading: boolean
  error: boolean
  onEdit: (lead: Customer) => void
  onDelete: (id: string) => void
  lastElementRef?: (node: HTMLTableRowElement | null) => void
}

export function CustomerTable({
  leads,
  loading,
  error,
  onEdit,
  onDelete,
  lastElementRef,
}: CustomerTableProps) {
  const [searchParams] = useSearchParams()
  const searchTerm = searchParams.get('search') || searchParams.get('q') || ''
  const phaseFilter = searchParams.get('phase') || searchParams.get('status') || ''
  const hasFilter = !!searchTerm || !!phaseFilter || Array.from(searchParams.keys()).length > 0
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  if (error) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p>Erro ao carregar clientes. Tente novamente mais tarde.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {hasFilter && leads.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setIsSyncModalOpen(true)} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" /> Sincronizar Remarketing
          </Button>
        </div>
      )}
      <CustomerDetailDrawer
        customerId={selectedCustomerId}
        open={!!selectedCustomerId}
        onOpenChange={(open) => !open && setSelectedCustomerId(null)}
      />
      <RemarketingSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        leads={leads}
        searchTerm={searchTerm}
      />
      <div className="rounded-md border">
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
              Array.from({ length: 15 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={COLUMNS.length + 2} className="py-3">
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={COLUMNS.length + 2}
                  className="h-32 text-center text-muted-foreground"
                >
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead, index) => {
                const phase = PHASES.find(
                  (p) => p.id.toString() === lead.status || p.title === lead.status,
                )
                const isLast = index === leads.length - 1
                return (
                  <TableRow
                    key={lead.id}
                    ref={isLast ? lastElementRef : null}
                    className="group hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomerId(lead.id)}
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {(lead.status === 'Lead Novo' ||
                          lead.status === 'Base de Clientes/Novo LYD' ||
                          lead.status === '') && (
                          <span className="relative flex h-2.5 w-2.5" title="Novo Lead">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                          </span>
                        )}
                        <Badge
                          variant="secondary"
                          className={cn('text-white', phase?.color || 'bg-slate-500')}
                        >
                          {phase?.title || 'Desconhecido'}
                        </Badge>
                      </div>
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

                      if (col.key === 'email_1_value') {
                        val = lead.email_1_value || lead.email || ''
                      }

                      if (col.key === 'phone') {
                        const rawPhone =
                          lead.phone_1_value ||
                          lead.phone ||
                          lead.phone_2_value ||
                          lead.phone_3_value ||
                          lead.phone_4_value ||
                          ''
                        val = formatPhone(rawPhone)
                      }

                      if (col.key === 'name') {
                        const concatenatedName = [lead.first_name, lead.middle_name, lead.last_name]
                          .filter(Boolean)
                          .join(' ')
                          .trim()

                        const isPlaceholder =
                          !val ||
                          val === 'Sem Nome' ||
                          val === 'Sem nome' ||
                          val === '—' ||
                          val.trim() === ''

                        if (isPlaceholder) {
                          if (concatenatedName !== '') {
                            val = concatenatedName
                          } else if (lead.email && lead.email.trim() !== '') {
                            val = lead.email
                          } else if (lead.phone && lead.phone.trim() !== '') {
                            val = lead.phone
                          } else {
                            val = 'Sem nome'
                          }
                        }
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
                    <TableCell
                      className="sticky right-0 bg-background group-hover:bg-muted/50 border-l transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(lead)}>
                            <Edit className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => onDelete(lead.id)}
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
      </div>
    </div>
  )
}
