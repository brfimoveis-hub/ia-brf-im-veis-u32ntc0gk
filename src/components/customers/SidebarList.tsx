import { useState } from 'react'
import { Search, Phone } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Customer } from './types'

interface Props {
  customers: Customer[]
}

export function SidebarList({ customers }: Props) {
  const [search, setSearch] = useState('')

  const filtered = customers.filter(
    (c) =>
      (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.phone || '').includes(search),
  )

  return (
    <div className="w-1/4 min-w-[280px] max-w-[350px] border-r bg-background flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold">Leads ({customers.length})</h2>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 flex flex-col gap-1">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="p-3 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border cursor-pointer"
            >
              <div className="font-medium text-sm truncate">{c.name || 'Sem Nome'}</div>
              <div className="flex items-center justify-between mt-1 gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <Phone className="w-3 h-3 flex-shrink-0" />{' '}
                  <span className="truncate">{c.phone || '-'}</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium truncate max-w-[120px] flex-shrink-0">
                  {c.status || 'Novo'}
                </span>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Nenhum lead encontrado.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
