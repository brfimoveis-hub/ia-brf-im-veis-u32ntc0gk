import { TableHead } from '@/components/ui/table'
import { ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortableTableHeadProps {
  label: string
  field: string
  currentSort: string
  onToggleSort: (field: string) => void
  className?: string
}

export function SortableTableHead({
  label,
  field,
  currentSort,
  onToggleSort,
  className,
}: SortableTableHeadProps) {
  const isActive = currentSort === field || currentSort === `-${field}`
  const direction = currentSort === field ? 'asc' : currentSort === `-${field}` ? 'desc' : null

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none hover:bg-muted/50 transition-colors whitespace-nowrap',
        className,
      )}
      onClick={() => onToggleSort(field)}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  )
}
