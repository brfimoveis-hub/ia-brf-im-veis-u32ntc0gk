import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function ClientesCore() {
  const [customers, setCustomers] = useState<any[]>([])
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    try {
      const [customersData, leadsData] = await Promise.all([
        pb.collection('customers').getFullList({ sort: '-created' }),
        pb.collection('leads').getFullList({ sort: '-created' }),
      ])
      setCustomers(customersData)
      setLeads(leadsData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('customers', () => loadData())
  useRealtime('leads', () => loadData())

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes e Leads</h1>
        <p className="text-muted-foreground">Gerencie seus registros de clientes e leads.</p>
      </div>

      <Tabs defaultValue="customers" className="w-full">
        <TabsList>
          <TabsTrigger value="customers">Clientes ({customers.length})</TabsTrigger>
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="customers">
          <Card>
            <CardHeader>
              <CardTitle>Clientes</CardTitle>
              <CardDescription>
                Visualização centralizada dos registros de clientes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customers.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum cliente encontrado.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.name || c.first_name || 'Sem nome'}
                          </TableCell>
                          <TableCell>{c.email || c.email_1_value || '-'}</TableCell>
                          <TableCell>{c.phone || c.phone_1_value || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.status || 'Sem status'}</Badge>
                          </TableCell>
                          <TableCell>{c.source || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Leads</CardTitle>
              <CardDescription>Rastreamento e gerenciamento de leads.</CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Nenhum lead encontrado.
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="font-medium">{l.name || 'Sem nome'}</TableCell>
                          <TableCell>{l.email || '-'}</TableCell>
                          <TableCell>{l.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{l.status || 'Novo'}</Badge>
                          </TableCell>
                          <TableCell>{l.source || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
