import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PaginationBarProps {
  currentPage: number
  totalPages: number
  totalItems: number
  perPage: number
  onPageChange: (page: number) => void
  onPerPageChange: (size: number) => void
  disabled?: boolean
  itemName?: string
}

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, current - 2)
  const end = Math.min(total - 1, current + 2)
  if (start > 2) pages.push('ellipsis')
  for (let i = start; i <= end; i++) pages.push(i)
  if (end < total - 1) pages.push('ellipsis')
  pages.push(total)
  return pages
}

export function PaginationBar({
  currentPage,
  totalPages,
  totalItems,
  perPage,
  onPageChange,
  onPerPageChange,
  disabled = false,
  itemName = 'clientes',
}: PaginationBarProps) {
  const first = totalItems === 0 ? 0 : (currentPage - 1) * perPage + 1
  const last = Math.min(currentPage * perPage, totalItems)
  const pageNumbers = getPageNumbers(currentPage, totalPages)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t px-4 py-3 bg-background">
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Mostrando {first}–{last} de {totalItems} {itemName}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline">
          Página {currentPage} de {totalPages}
        </span>
        <Select
          value={String(perPage)}
          onValueChange={(v) => onPerPageChange(Number(v))}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 w-[90px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / pág</SelectItem>
            <SelectItem value="20">20 / pág</SelectItem>
            <SelectItem value="50">50 / pág</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(1)}
          disabled={disabled || currentPage <= 1}
        >
          <ChevronsLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          aria-label="Anterior"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>
        {pageNumbers.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e-${i}`} className="px-1.5 text-xs text-muted-foreground">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === currentPage ? 'default' : 'outline'}
              size="icon"
              className={cn('h-7 w-7 text-xs', p !== currentPage && 'hidden sm:inline-flex')}
              onClick={() => onPageChange(p)}
              disabled={disabled}
            >
              {p}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 px-2"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage >= totalPages}
          aria-label="Próximo"
        >
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Próximo</span>
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          onClick={() => onPageChange(totalPages)}
          disabled={disabled || currentPage >= totalPages}
        >
          <ChevronsRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
