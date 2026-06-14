import { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/hooks/use-auth'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FileText, Edit2 } from 'lucide-react'

export default function Cadences() {
  const { user } = useAuth()
  const [cadences, setCadences] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!user) return
    try {
      const records = await pb.collection('cadences').getFullList({
        filter: `user_id = "${user.id}"`,
        sort: 'order',
      })
      setCadences(records)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user])

  useRealtime('cadences', () => loadData())

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      await pb.collection('cadences').update(id, { is_active: !current })
      toast({ title: 'Sucesso', description: 'Status da cadência atualizado.' })
    } catch (e) {
      toast({ title: 'Erro', description: 'Não foi possível atualizar.', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-[200px]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadências</h1>
          <p className="text-muted-foreground">Gerencie a automação dos fluxos de mensagens.</p>
        </div>
        <Button>Nova Cadência</Button>
      </div>

      {cadences.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Nenhuma cadência encontrada. Crie sua primeira cadência de automação.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {cadences.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-4">
                  <CardTitle className="text-xl">{c.title || 'Sem título'}</CardTitle>
                  <Switch
                    checked={c.is_active}
                    onCheckedChange={() => toggleStatus(c.id, c.is_active)}
                  />
                </div>
                <CardDescription className="line-clamp-2">
                  {c.description || 'Sem descrição'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <strong>Ordem:</strong> {c.order ?? '-'}
                  </p>
                  {c.steps && (
                    <p>
                      <strong>Passos:</strong>{' '}
                      {Array.isArray(c.steps) ? c.steps.length : 'Configurado'}
                    </p>
                  )}
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {c.ebook_file && (
                      <span className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded border">
                        <FileText className="h-3 w-3" /> E-book
                      </span>
                    )}
                    {c.price_table_file && (
                      <span className="flex items-center gap-1 text-xs bg-slate-100 px-2 py-1 rounded border">
                        <FileText className="h-3 w-3" /> Tabela
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Edit2 className="mr-2 h-4 w-4" /> Editar Configurações
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Editar {c.title}</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-sm text-muted-foreground text-center">
                      <p>
                        A edição detalhada dos passos (JSON) e upload de arquivos está em
                        desenvolvimento.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
