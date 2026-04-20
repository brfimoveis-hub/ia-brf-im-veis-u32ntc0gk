import { useCallback, useRef } from 'react'
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
import { MoreHorizontal, Edit, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import { Customer } from '@/services/customers'
import { PHASES, COLUMNS } from './constants'
import { cn } from '@/lib/utils'

interface CustomerTableProps {
  leads: Customer[]
  loading: boolean
  loadingMore: boolean
  hasMore: boolean
  error: boolean
  onEdit: (lead: Customer) => void
  onDelete: (id: string) => void
  onLoadMore: () => void
}

export function CustomerTable({
  leads,
  loading,
  loadingMore,
  hasMore,
  error,
  onEdit,
  onDelete,
  onLoadMore,
}: CustomerTableProps) {
  const observer = useRef<IntersectionObserver | null>(null)

  const lastRowRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      if (loading || loadingMore) return
      if (observer.current) observer.current.disconnect()

      if (node) {
        observer.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && hasMore) {
              onLoadMore()
            }
          },
          { rootMargin: '200px' },
        )
        observer.current.observe(node)
      }
    },
    [loading, loadingMore, hasMore, onLoadMore],
  )

  if (error) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p>Erro ao carregar clientes. Tente novamente mais tarde.</p>
      </div>
    )
  }

  return (
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
        {loading && !loadingMore ? (
          Array.from({ length: 10 }).map((_, i) => (
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
          <>
            {leads.map((lead, index) => {
              const isLast = index === leads.length - 1
              const phase = PHASES.find((p) => p.id.toString() === lead.status)
              return (
                <TableRow
                  key={lead.id}
                  ref={isLast ? lastRowRef : null}
                  className="group hover:bg-muted/50"
                >
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
                    if (col.key === 'name') {
                      const concatenatedName = [lead.first_name, lead.middle_name, lead.last_name]
                        .filter(Boolean)
                        .join(' ')
                      val = concatenatedName || (val !== 'Sem Nome' ? val : '') || '—'
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
            })}
            {loadingMore && (
              <TableRow>
                <TableCell colSpan={COLUMNS.length + 2} className="h-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
          </>
        )}
      </TableBody>
    </Table>
  )
}
