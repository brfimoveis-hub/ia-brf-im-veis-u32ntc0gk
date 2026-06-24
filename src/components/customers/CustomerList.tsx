import { useNavigate, Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatPhone } from '@/lib/utils'
import type { Customer } from '@/types/customer'

export function CustomerList({ customers }: { customers: Customer[] }) {
  const navigate = useNavigate()

  return (
    <div className="border rounded-lg bg-white overflow-hidden flex-1 flex flex-col">
      <div className="overflow-auto flex-1">
        <Table>
          <TableHeader className="sticky top-0 bg-slate-50 z-10 shadow-sm">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Status (Pipeline)</TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Urgência</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                  Nenhum cliente encontrado.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((c) => (
                <TableRow
                  key={c.id}
                  className="hover:bg-slate-50/50 cursor-pointer"
                  onClick={() => navigate(`/customers/${c.id}`)}
                >
                  <TableCell className="font-medium text-slate-800">{c.name || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm">{formatPhone(c.phone) || '-'}</span>
                      {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="font-medium bg-slate-100 text-slate-700 hover:bg-slate-200"
                    >
                      {c.status || 'Sem Status'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600 text-sm">{c.neighborhood || '-'}</TableCell>
                  <TableCell>
                    {c.urgency ? (
                      <Badge
                        variant={c.urgency >= 4 ? 'destructive' : 'outline'}
                        className="font-medium"
                      >
                        {c.urgency}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild onClick={(e) => e.stopPropagation()}>
                      <Link to={`/customers/${c.id}`}>Ver CRM</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
