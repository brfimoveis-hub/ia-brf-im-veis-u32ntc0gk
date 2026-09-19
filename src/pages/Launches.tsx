import { useState, useEffect } from 'react'
import { type Launch, getLaunches, createLaunch, deleteLaunch } from '@/services/launches'
import {
  Building2,
  Plus,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Search,
  CheckCircle2,
  Clock,
  Trash2,
  Bot,
  MapPin,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { LaunchDetail } from '@/components/launches/LaunchDetail'

export function Launches() {
  const [launches, setLaunches] = useState<Launch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLaunch, setSelectedLaunch] = useState<Launch | null>(null)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)

  // Novo Lançamento Form
  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newEnterprise, setNewEnterprise] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const list = await getLaunches()
      setLaunches(list)
    } catch (err: any) {
      console.error('Erro ao carregar lançamentos:', err)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar a lista de lançamentos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleNameChange = (val: string) => {
    setNewName(val)
    if (!newSlug || newSlug === slugify(newName)) {
      setNewSlug(slugify(val))
    }
  }

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '')
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newSlug.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome e o slug do lançamento.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      const created = await createLaunch({
        name: newName.trim(),
        slug: newSlug.trim(),
        enterprise_name: newEnterprise.trim() || newName.trim(),
        status: 'rascunho',
        cta_whatsapp_number: '5548992098050',
        cta_default_message: `Olá Bia! Gostaria de informações sobre o lançamento ${newName.trim()} (origem: landing page ${newSlug.trim()})`,
        units: [],
        differentials: [],
        keywords: [newName.toLowerCase(), newSlug.toLowerCase()],
      })

      setLaunches([created, ...launches])
      setCreateModalOpen(false)
      setNewName('')
      setNewSlug('')
      setNewEnterprise('')
      setSelectedLaunch(created)

      toast({
        title: 'Lançamento criado!',
        description: 'Agora você pode preencher o dossiê manualmente ou pedir ajuda à Bia Mãe.',
      })
    } catch (err: any) {
      console.error('Erro ao criar lançamento:', err)
      toast({
        title: 'Erro ao criar',
        description: err?.message || 'Verifique se o slug já não está em uso.',
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja excluir o lançamento "${name}"?`)) return
    try {
      await deleteLaunch(id)
      setLaunches(launches.filter((l) => l.id !== id))
      if (selectedLaunch?.id === id) {
        setSelectedLaunch(null)
      }
      toast({
        title: 'Lançamento excluído',
        description: `O lançamento ${name} foi removido.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Falha ao remover lançamento.',
        variant: 'destructive',
      })
    }
  }

  const filteredLaunches = launches.filter((l) => {
    const s = searchTerm.toLowerCase()
    return (
      l.name.toLowerCase().includes(s) ||
      (l.enterprise_name && l.enterprise_name.toLowerCase().includes(s)) ||
      l.slug.toLowerCase().includes(s)
    )
  })

  // Se houver um lançamento selecionado, renderiza o detalhe do Dossiê
  if (selectedLaunch) {
    return (
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <LaunchDetail
          launch={selectedLaunch}
          onBack={() => {
            setSelectedLaunch(null)
            loadData()
          }}
          onUpdated={(updated) => {
            setSelectedLaunch(updated)
            setLaunches((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
          }}
        />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Lançamentos Imobiliários
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Bia Mãe + Landing Pages
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Dossiês de empreendimentos, cadências específicas de vendas e páginas de captura
            integradas à Bia no WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-xs"
          >
            <Plus className="h-4 w-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Banner Explicativo Bia Mãe */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
            <Bot className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Como funciona a Bia Mãe?
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Agente Nativo Interno
              </span>
            </h3>
            <p className="text-xs text-muted-foreground max-w-3xl leading-relaxed">
              Você cola tabelas, PDFs e folhetos crus para a <strong>Bia Mãe</strong>. Ela organiza
              as unidades, valores, diferenciais e escreve a <strong>cadência em 10 passos</strong>.
              Quando você aprova e clica em <em>Publicar</em>, a Bia atendente carrega este dossiê
              para responder leads que vierem daquele lançamento no WhatsApp!
            </p>
          </div>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empreendimento ou slug..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
      </div>

      {/* Lista de Lançamentos */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">
          <div className="h-8 w-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs">Carregando lançamentos...</p>
        </div>
      ) : filteredLaunches.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/50">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <h3 className="font-bold text-base">Nenhum lançamento encontrado</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            {searchTerm
              ? 'Nenhum lançamento coincide com a busca.'
              : 'Cadastre o primeiro lançamento imobiliário para começar a usar os dossiês e as landing pages.'}
          </p>
          <Button
            size="sm"
            onClick={() => setCreateModalOpen(true)}
            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Criar Lançamento
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLaunches.map((item) => {
            const unitsCount = Array.isArray(item.units) ? item.units.length : 0
            const imagesCount = Array.isArray(item.images) ? item.images.length : 0

            return (
              <Card
                key={item.id}
                onClick={() => setSelectedLaunch(item)}
                className="cursor-pointer border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:shadow-md transition-all group overflow-hidden"
              >
                <div
                  className={`h-1.5 w-full ${
                    item.status === 'publicado'
                      ? 'bg-emerald-600'
                      : item.status === 'em_revisao'
                        ? 'bg-amber-500'
                        : 'bg-slate-400'
                  }`}
                />
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 transition-colors">
                        {item.name}
                      </h3>
                      <span className="text-xs text-muted-foreground block truncate">
                        {item.enterprise_name || item.name}
                      </span>
                    </div>

                    <div>
                      {item.status === 'publicado' ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Publicado</Badge>
                      ) : item.status === 'em_revisao' ? (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-300 text-[10px]"
                        >
                          Em Revisão
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Rascunho
                        </Badge>
                      )}
                    </div>
                  </div>

                  {item.location && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-slate-500" />
                      <span>
                        {unitsCount} {unitsCount === 1 ? 'unidade' : 'unidades'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                      <span className="truncate">/l/{item.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1">
                      Abrir Dossiê & Bia Mãe <ChevronRight className="h-3.5 w-3.5" />
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDelete(e, item.id, item.name)}
                      className="h-7 w-7 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
                      title="Excluir lançamento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Criação Rápida */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Novo Lançamento Imobiliário</DialogTitle>
            <DialogDescription className="text-xs">
              Crie o identificador do lançamento para começar a estruturar o dossiê e a página
              pública.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m_name" className="text-xs">
                Nome Comercial do Lançamento *
              </Label>
              <Input
                id="m_name"
                value={newName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Ex: Villa dos Açores"
                className="h-9 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m_enterprise" className="text-xs">
                Nome Oficial do Empreendimento
              </Label>
              <Input
                id="m_enterprise"
                value={newEnterprise}
                onChange={(e) => setNewEnterprise(e.target.value)}
                placeholder="Ex: Residencial Villa dos Açores"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="m_slug" className="text-xs">
                Slug da Landing Page (/l/...) *
              </Label>
              <Input
                id="m_slug"
                value={newSlug}
                onChange={(e) => setNewSlug(slugify(e.target.value))}
                placeholder="Ex: villa-dos-acores"
                className="h-9 text-xs font-mono"
                required
              />
              <span className="text-[11px] text-muted-foreground block">
                Será o link público:{' '}
                <code className="text-emerald-600">/l/{newSlug || 'slug'}</code>
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="h-8 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                {creating ? 'Criando...' : 'Criar e Abrir Dossiê'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Launches
