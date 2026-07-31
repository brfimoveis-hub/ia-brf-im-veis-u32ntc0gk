import { useState, useMemo } from 'react'
import { usePaginatedList } from '@/hooks/use-paginated-list'
import { createCadence, updateCadence, deleteCadence, type Cadence } from '@/services/cadences'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, Edit, RefreshCw, AlertCircle, Search, Download } from 'lucide-react'
import { CadenceFormDialog } from '@/components/cadences/CadenceFormDialog'
import { useAutoRetry } from '@/hooks/use-auto-retry'
import { exportCadencesToCSV } from '@/lib/csv-export'

function CadencesSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-[180px]" />
      </div>
      <div className="grid gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pl-6 pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-10" />
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-6">
              <div className="grid md:grid-cols-2 gap-4 mt-2">
                <Skeleton className="h-20 w-full rounded-md" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function Cadences() {
  const { user } = useAuth()
  const { toast } = useToast()
  const {
    items: cadences,
    loading,
    error,
    refresh,
    retry,
    searchInput,
    setSearchInput,
  } = usePaginatedList<Cadence>({
    collection: 'cadences',
    perPage: 50,
    initialSort: 'order',
    searchFields: ['title', 'description'],
  })
  const { isRetrying } = useAutoRetry(error, retry, 800, loading)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCadence, setEditingCadence] = useState<Cadence | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filteredCadences = useMemo(() => {
    if (statusFilter === 'all') return cadences
    if (statusFilter === 'active') return cadences.filter((c) => c.is_active)
    return cadences.filter((c) => !c.is_active)
  }, [cadences, statusFilter])

  const handleOpenNew = () => {
    setEditingCadence(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (cadence: Cadence) => {
    setEditingCadence(cadence)
    setDialogOpen(true)
  }

  const handleSave = async (data: Partial<Cadence>, editingId: string | null) => {
    try {
      if (editingId) {
        await updateCadence(editingId, data)
        toast({ title: 'Cadência atualizada com sucesso' })
      } else {
        await createCadence({ ...data, user_id: user.id } as Partial<Cadence>)
        toast({ title: 'Cadência criada com sucesso' })
      }
      setDialogOpen(false)
      refresh()
    } catch {
      toast({ title: 'Erro ao salvar cadência', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta cadência?')) return
    try {
      await deleteCadence(id)
      toast({ title: 'Cadência excluída com sucesso' })
      refresh()
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateCadence(id, { is_active: active })
      refresh()
    } catch {
      toast({ title: 'Erro ao atualizar', variant: 'destructive' })
    }
  }

  if (loading || (error && isRetrying)) {
    return <CadencesSkeleton />
  }

  if (error) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadências de Evolução</h1>
          <p className="text-muted-foreground">
            Configure os até 10 passos do funil automatizado da IA.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg">
          <AlertCircle className="h-10 w-10 text-destructive mb-3" />
          <p className="text-lg font-medium mb-1">Alguns dados não podem ser carregados.</p>
          <p className="text-sm text-muted-foreground mb-4">Tente novamente.</p>
          <Button onClick={retry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cadências de Evolução</h1>
          <p className="text-muted-foreground">
            Configure os até 10 passos do funil automatizado da IA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={refresh} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() => exportCadencesToCSV(filteredCadences)}
            disabled={filteredCadences.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleOpenNew} disabled={cadences.length >= 10}>
            <Plus className="h-4 w-4 mr-2" /> Novo Passo ({cadences.length}/10)
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="Buscar por título ou descrição..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {filteredCadences.map((cadence, index) => (
          <Card key={cadence.id} className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-2 bg-primary/20"></div>
            <CardHeader className="pl-6 pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Passo {cadence.order || index + 1}</Badge>
                    <CardTitle className="text-lg">{cadence.title}</CardTitle>
                    {!cadence.is_active && <Badge variant="secondary">Inativo</Badge>}
                  </div>
                  <CardDescription>{cadence.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={cadence.is_active}
                    onCheckedChange={(c) => handleToggleActive(cadence.id, c)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(cadence)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(cadence.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-6">
              <div className="grid md:grid-cols-2 gap-4 text-sm mt-2">
                <div className="bg-muted/30 p-3 rounded-md">
                  <span className="font-semibold text-xs uppercase text-muted-foreground mb-1 block">
                    Conteúdo (Mensagem Base)
                  </span>
                  <p className="line-clamp-3">{cadence.content}</p>
                </div>
                <div className="bg-primary/5 p-3 rounded-md border border-primary/10">
                  <span className="font-semibold text-xs uppercase text-primary mb-1 block">
                    Instruções para IA
                  </span>
                  <p className="line-clamp-3 italic">
                    {cadence.ai_instructions || 'Nenhuma instrução específica.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredCadences.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            Nenhuma cadência encontrada. Crie o primeiro passo do seu funil.
          </div>
        )}
      </div>

      <CadenceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cadence={editingCadence}
        cadenceCount={cadences.length}
        onSave={handleSave}
      />
    </div>
  )
}
