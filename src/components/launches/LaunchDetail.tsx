import { useState, useEffect, useRef } from 'react'
import { type Launch, type LaunchUnit, updateLaunch, publishLaunch } from '@/services/launches'
import pb from '@/lib/pocketbase/client'
import {
  Building2,
  FileText,
  Globe,
  Share2,
  Sparkles,
  Save,
  CheckCircle2,
  Layers,
  Plus,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Upload,
  RefreshCw,
  Send,
  MessageSquare,
  ArrowLeft,
  Calendar,
  DollarSign,
  Download,
  AlertCircle,
  HardDrive,
} from 'lucide-react'
import {
  calculateBiaStorageUsage,
  assertCanUploadFiles,
  type StorageUsageSummary,
  MAX_SINGLE_FILE_SIZE_LABEL,
} from '@/services/ai_knowledge_storage'
import { StorageUsageBar } from '@/components/common/StorageUsageBar'
import {
  uploadAiKnowledgeFile,
  getAiKnowledgeFiles,
  deleteAiKnowledgeFile,
} from '@/services/ai_knowledge_files'
import type { AiKnowledgeFile } from '@/services/ai_knowledge_files'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'
import { BiaMaeChat } from './BiaMaeChat'

interface LaunchDetailProps {
  launch: Launch
  onBack: () => void
  onUpdated: (launch: Launch) => void
}

export function LaunchDetail({ launch: initialLaunch, onBack, onUpdated }: LaunchDetailProps) {
  const [launch, setLaunch] = useState<Launch>(initialLaunch)
  const [activeTab, setActiveTab] = useState<
    'overview' | 'units' | 'cadence' | 'gallery' | 'materials' | 'landing' | 'chat'
  >('overview')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [storageUsage, setStorageUsage] = useState<StorageUsageSummary | null>(null)
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [launchKnowledgeFiles, setLaunchKnowledgeFiles] = useState<AiKnowledgeFile[]>([])
  const [loadingMaterials, setLoadingMaterials] = useState(false)
  const [uploadingMaterial, setUploadingMaterial] = useState(false)
  const materialFileInputRef = useRef<HTMLInputElement>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: launch.name || '',
    slug: launch.slug || '',
    enterprise_name: launch.enterprise_name || '',
    headline: launch.headline || '',
    description: launch.description || '',
    location: launch.location || '',
    payment_terms: launch.payment_terms || '',
    sales_arguments: launch.sales_arguments || '',
    specific_cadence: launch.specific_cadence || '',
    cta_whatsapp_number: launch.cta_whatsapp_number || '5548992098050',
    cta_default_message: launch.cta_default_message || '',
    differentialsText: Array.isArray(launch.differentials) ? launch.differentials.join('\n') : '',
    keywordsText: Array.isArray(launch.keywords) ? launch.keywords.join(', ') : '',
  })

  const [units, setUnits] = useState<LaunchUnit[]>(Array.isArray(launch.units) ? launch.units : [])

  const publicLandingUrl = `${window.location.origin}/l/${launch.slug}`

  // Carregar armazenamento geral e arquivos da base associados a este empreendimento
  const refreshStorageAndMaterials = async () => {
    setLoadingUsage(true)
    setLoadingMaterials(true)
    try {
      const [usage, allFiles] = await Promise.all([
        calculateBiaStorageUsage(),
        getAiKnowledgeFiles(),
      ])
      setStorageUsage(usage)
      // Filtrar arquivos associados a este lançamento (pelo nome do lançamento ou pelo enterprise_name)
      const matching = allFiles.filter((f) => {
        const ent = (f.enterprise || '').toLowerCase().trim()
        const lName = (launch.name || '').toLowerCase().trim()
        const lEntName = (launch.enterprise_name || '').toLowerCase().trim()
        return (
          (ent && lName && ent === lName) ||
          (ent && lEntName && ent === lEntName) ||
          (ent && lName.includes(ent)) ||
          (ent && lEntName.includes(ent))
        )
      })
      setLaunchKnowledgeFiles(matching)
    } catch (err) {
      console.warn('Erro ao atualizar uso de armazenamento do dossiê:', err)
    } finally {
      setLoadingUsage(false)
      setLoadingMaterials(false)
    }
  }

  useEffect(() => {
    refreshStorageAndMaterials()
  }, [launch.id, launch.name, launch.enterprise_name])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleAddUnit = () => {
    const newUnit: LaunchUnit = {
      id: `u-${Date.now()}`,
      typology: 'Nova Tipologia',
      area: '50m²',
      price: 'R$ 300.000',
      available: true,
      notes: '',
    }
    setUnits([...units, newUnit])
  }

  const handleUpdateUnit = (index: number, field: keyof LaunchUnit, value: any) => {
    const next = [...units]
    next[index] = { ...next[index], [field]: value }
    setUnits(next)
  }

  const handleRemoveUnit = (index: number) => {
    setUnits(units.filter((_, i) => i !== index))
  }

  const handleSaveDossier = async (newStatus?: Launch['status']) => {
    setSaving(true)
    try {
      const diffArray = formData.differentialsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      const kwArray = formData.keywordsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)

      const payload: Partial<Launch> = {
        name: formData.name,
        slug: formData.slug,
        enterprise_name: formData.enterprise_name,
        headline: formData.headline,
        description: formData.description,
        location: formData.location,
        payment_terms: formData.payment_terms,
        sales_arguments: formData.sales_arguments,
        specific_cadence: formData.specific_cadence,
        cta_whatsapp_number: formData.cta_whatsapp_number,
        cta_default_message: formData.cta_default_message,
        differentials: diffArray,
        keywords: kwArray,
        units: units,
      }

      if (newStatus) {
        payload.status = newStatus
      }

      const updated = await updateLaunch(launch.id, payload)
      setLaunch(updated)
      onUpdated(updated)
      toast({
        title: 'Dossiê salvo',
        description: 'Alterações salvas com sucesso no banco de dados.',
      })
    } catch (err: any) {
      console.error('Erro ao salvar:', err)
      toast({
        title: 'Erro ao salvar',
        description: err?.message || 'Verifique os campos e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePublishToBia = async () => {
    setPublishing(true)
    try {
      // Salva primeiro o estado atual
      await handleSaveDossier('publicado')
      const res = await publishLaunch(launch.id)
      setLaunch((prev) => ({ ...prev, status: 'publicado' }))
      toast({
        title: 'Publicado no Cérebro da Bia!',
        description:
          'Agora a Bia atendente carrega este dossiê e a cadência específica nas conversas do WhatsApp.',
      })
    } catch (err: any) {
      console.error('Erro ao publicar:', err)
      toast({
        title: 'Erro na publicação',
        description: err?.message || 'Não foi possível publicar.',
        variant: 'destructive',
      })
    } finally {
      setPublishing(false)
    }
  }

  const handleCopyLandingLink = () => {
    navigator.clipboard.writeText(publicLandingUrl)
    setCopiedLink(true)
    toast({
      title: 'Link copiado!',
      description: 'Pronto para colar em campanhas do Meta Ads ou postagens.',
    })
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const incoming = Array.from(e.target.files)

    // Validar cota total de 2 GB e limite por arquivo antes do envio
    try {
      await assertCanUploadFiles(incoming, storageUsage?.totalUsedBytes)
    } catch (quotaErr: any) {
      toast({
        title: 'Não foi possível enviar',
        description: quotaErr.message || 'Verifique o limite de arquivo ou a cota de 2 GB da Bia.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }

    setSaving(true)
    try {
      const data = new FormData()
      for (let i = 0; i < incoming.length; i++) {
        data.append('images', incoming[i])
      }
      const updated = await updateLaunch(launch.id, data)
      setLaunch(updated)
      onUpdated(updated)
      await refreshStorageAndMaterials()
      toast({
        title: 'Fotos enviadas!',
        description: 'Imagens adicionadas à galeria do lançamento e computadas no espaço de 2 GB.',
      })
    } catch (err: any) {
      console.error('Erro ao enviar imagem:', err)
      toast({
        title: 'Erro no upload',
        description: err?.message || 'Não foi possível carregar as imagens.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
      e.target.value = ''
    }
  }

  // Upload de material específico do dossiê (PDF de tabela, memorial descritivo, book do corretor)
  const handleMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const incoming = Array.from(e.target.files)

    try {
      await assertCanUploadFiles(incoming, storageUsage?.totalUsedBytes)
    } catch (quotaErr: any) {
      toast({
        title: 'Não foi possível enviar material',
        description: quotaErr.message || 'Verifique o limite de arquivo ou a cota de 2 GB da Bia.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }

    setUploadingMaterial(true)
    try {
      const targetEnterprise = launch.name || launch.enterprise_name || 'Lançamento'
      const currentUserId = pb.authStore.model?.id || ''

      // Faz upload vinculado à tag deste lançamento para a Bia ler automaticamente
      let runningUsed = storageUsage?.totalUsedBytes || 0
      for (const file of incoming) {
        await uploadAiKnowledgeFile(file, currentUserId, undefined, targetEnterprise, runningUsed)
        runningUsed += file.size
      }

      await refreshStorageAndMaterials()
      toast({
        title: 'Materiais indexados com sucesso!',
        description: `Os arquivos foram vinculados a "${targetEnterprise}" e a Bia já tem acesso a eles.`,
      })
    } catch (err: any) {
      console.error('Erro no upload de material:', err)
      toast({
        title: 'Erro ao enviar material',
        description: err?.message || 'Verifique o formato e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setUploadingMaterial(false)
      if (materialFileInputRef.current) {
        materialFileInputRef.current.value = ''
      }
    }
  }

  const handleDeleteMaterial = async (fileItem: AiKnowledgeFile) => {
    if (!confirm(`Remover o documento "${fileItem.name}" da base de conhecimento da Bia?`)) {
      return
    }
    try {
      await deleteAiKnowledgeFile(fileItem.id)
      toast({
        title: 'Documento removido',
        description: 'Espaço de armazenamento liberado com sucesso.',
      })
      await refreshStorageAndMaterials()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err?.message || 'Não foi possível remover o arquivo.',
        variant: 'destructive',
      })
    }
  }

  const statusBadge = (st: Launch['status']) => {
    switch (st) {
      case 'publicado':
        return (
          <Badge className="bg-emerald-600 text-white gap-1 text-xs">
            <CheckCircle2 className="h-3 w-3" /> Publicado no Cérebro da Bia
          </Badge>
        )
      case 'em_revisao':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 text-xs">
            Pronto para Revisão
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary" className="text-xs">
            Rascunho
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar de navegação e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
                {launch.name}
              </h1>
              {statusBadge(launch.status)}
            </div>
            <p className="text-xs text-muted-foreground">
              Slug: <code className="text-emerald-700 dark:text-emerald-300">/l/{launch.slug}</code>{' '}
              • Empreendimento: {launch.enterprise_name || 'Não definido'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Link para Landing Page pública */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLandingLink}
            className="h-8 gap-1.5 text-xs"
            title="Copiar link da Landing Page pública"
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            Copiar Link LP
          </Button>

          <a
            href={`/l/${launch.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors h-8"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Ver LP
          </a>

          {/* Salvar Dossiê */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveDossier()}
            disabled={saving}
            className="h-8 gap-1.5 text-xs"
          >
            {saving ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Salvar
          </Button>

          {/* Publicar no Cérebro da Bia */}
          <Button
            size="sm"
            onClick={handlePublishToBia}
            disabled={publishing}
            className="h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
          >
            {publishing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {launch.status === 'publicado' ? 'Re-publicar na Bia' : 'Publicar na Bia'}
          </Button>
        </div>
      </div>

      {/* Abas do Dossiê */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 flex-wrap">
          <TabsTrigger value="overview" className="text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="units" className="text-xs">
            Tabela de Unidades ({units.length})
          </TabsTrigger>
          <TabsTrigger value="cadence" className="text-xs">
            Cadência Específica (10 Passos)
          </TabsTrigger>
          <TabsTrigger value="gallery" className="text-xs">
            Galeria de Fotos ({launch.images?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="materials" className="text-xs flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            Materiais & Dossiê ({launchKnowledgeFiles.length})
          </TabsTrigger>
          <TabsTrigger value="landing" className="text-xs">
            Landing Page & CTA
          </TabsTrigger>
          <TabsTrigger
            value="chat"
            className="text-xs flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Chat c/ Bia Mãe
          </TabsTrigger>
        </TabsList>

        {/* Aba 1: Visão Geral */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações do Empreendimento</CardTitle>
              <CardDescription className="text-xs">
                Dados essenciais que orientam a IA e alimentam o topo da Landing Page.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs">
                    Nome Interno / Apelido
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Villa dos Açores"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="enterprise_name" className="text-xs">
                    Nome Oficial do Empreendimento
                  </Label>
                  <Input
                    id="enterprise_name"
                    name="enterprise_name"
                    value={formData.enterprise_name}
                    onChange={handleInputChange}
                    placeholder="Ex: Residencial Villa dos Açores"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="slug" className="text-xs">
                    Slug da Landing Page (/l/...)
                  </Label>
                  <Input
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="Ex: villa-dos-acores"
                    className="h-9 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-xs">
                    Localização / Bairro e Cidade
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Ex: Rio Caveiras / Biguaçu - SC"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="headline" className="text-xs">
                  Headline de Alto Impacto
                </Label>
                <Input
                  id="headline"
                  name="headline"
                  value={formData.headline}
                  onChange={handleInputChange}
                  placeholder="Ex: Apartamentos modernos em Biguaçu com condições facilitadas de lançamento"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="text-xs">
                  Descrição Comercial
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o projeto, localização, infraestrutura e proposta de valor."
                  className="min-h-[100px] text-xs"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="payment_terms" className="text-xs">
                    Condições de Pagamento
                  </Label>
                  <Textarea
                    id="payment_terms"
                    name="payment_terms"
                    value={formData.payment_terms}
                    onChange={handleInputChange}
                    placeholder="Ex: Entrada facilitada em até 40x direto com a construtora, CUB, chaves..."
                    className="min-h-[90px] text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="sales_arguments" className="text-xs">
                    Argumentos Comerciais & Gatilhos
                  </Label>
                  <Textarea
                    id="sales_arguments"
                    name="sales_arguments"
                    value={formData.sales_arguments}
                    onChange={handleInputChange}
                    placeholder="Principais motivos para comprar, potencial de valorização, comparativos..."
                    className="min-h-[90px] text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="differentialsText" className="text-xs">
                  Diferenciais (um por linha)
                </Label>
                <Textarea
                  id="differentialsText"
                  name="differentialsText"
                  value={formData.differentialsText}
                  onChange={handleInputChange}
                  placeholder="Piscina com deck molhado&#10;Salão de festas climatizado&#10;Vagas demarcadas"
                  className="min-h-[90px] text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keywordsText" className="text-xs">
                  Palavras-chave de Reconhecimento (separadas por vírgula)
                </Label>
                <Input
                  id="keywordsText"
                  name="keywordsText"
                  value={formData.keywordsText}
                  onChange={handleInputChange}
                  placeholder="villa acores, villa dos açores, lancamento biguacu"
                  className="h-9 text-xs"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Usadas pela Bia para ativar automaticamente este dossiê quando o cliente mandar
                  mensagem no WhatsApp.
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 2: Unidades */}
        <TabsContent value="units" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Tabela de Unidades e Valores</CardTitle>
                <CardDescription className="text-xs">
                  Cadastre as tipologias, áreas e valores que aparecem na Landing Page e no catálogo
                  da Bia.
                </CardDescription>
              </div>
              <Button size="sm" onClick={handleAddUnit} className="h-8 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Adicionar Unidade
              </Button>
            </CardHeader>
            <CardContent>
              {units.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Layers className="h-10 w-10 mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-sm">Nenhuma unidade cadastrada ainda</p>
                  <p className="text-xs mt-1">
                    Cole sua tabela no Chat com a Bia Mãe para ela cadastrar automaticamente ou
                    clique em "Adicionar Unidade".
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {units.map((unit, idx) => (
                    <div
                      key={unit.id || idx}
                      className="p-3.5 rounded-xl border bg-slate-50/50 dark:bg-slate-900/50 grid sm:grid-cols-12 gap-3 items-center"
                    >
                      <div className="sm:col-span-4 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Tipologia</Label>
                        <Input
                          value={unit.typology}
                          onChange={(e) => handleUpdateUnit(idx, 'typology', e.target.value)}
                          placeholder="Ex: 2 Dormitórios c/ Suíte"
                          className="h-8 text-xs bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Área Privativa</Label>
                        <Input
                          value={unit.area}
                          onChange={(e) => handleUpdateUnit(idx, 'area', e.target.value)}
                          placeholder="Ex: 58m²"
                          className="h-8 text-xs bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-3 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Valor de Tabela</Label>
                        <Input
                          value={unit.price}
                          onChange={(e) => handleUpdateUnit(idx, 'price', e.target.value)}
                          placeholder="Ex: R$ 295.000"
                          className="h-8 text-xs bg-white dark:bg-slate-800 font-semibold text-emerald-600"
                        />
                      </div>

                      <div className="sm:col-span-2 space-y-1">
                        <Label className="text-[10px] text-muted-foreground">Observação</Label>
                        <Input
                          value={unit.notes || ''}
                          onChange={(e) => handleUpdateUnit(idx, 'notes', e.target.value)}
                          placeholder="Ex: Sol manhã"
                          className="h-8 text-xs bg-white dark:bg-slate-800"
                        />
                      </div>

                      <div className="sm:col-span-1 flex items-end justify-end pt-3 sm:pt-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveUnit(idx)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 3: Cadência Específica */}
        <TabsContent value="cadence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadência Específica de 10 Passos</CardTitle>
              <CardDescription className="text-xs">
                As instruções prioritárias que a Bia atendente segue quando o lead tem origem deste
                lançamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                name="specific_cadence"
                value={formData.specific_cadence}
                onChange={handleInputChange}
                placeholder="Insira a cadência específica de vendas do empreendimento (ou peça para a Bia Mãe estruturar)..."
                className="min-h-[300px] text-xs font-mono leading-relaxed"
              />
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Dica:</strong> Se precisar aprimorar a cadência, vá na aba{' '}
                  <strong>"Chat c/ Bia Mãe"</strong> e peça:{' '}
                  <em>
                    "Bia Mãe, escreva a cadência em 10 passos para o {launch.name} focada em
                    investidores e famílias"
                  </em>
                  .
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 4: Galeria de Fotos */}
        <TabsContent value="gallery" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base">Galeria do Lançamento</CardTitle>
                <CardDescription className="text-xs">
                  Fotos e perspectivas 3D que são exibidas na Landing Page pública e alimentam o
                  dossiê.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="image_upload" className="cursor-pointer">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold shadow-xs ${
                      storageUsage?.isFull
                        ? 'bg-rose-600 text-white cursor-not-allowed opacity-80'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    <Upload className="h-3.5 w-3.5" /> Enviar Fotos
                  </div>
                  <input
                    id="image_upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={saving || Boolean(storageUsage?.isFull)}
                  />
                </Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Indicador de uso do 1 GB */}
              <StorageUsageBar usage={storageUsage} loading={loadingUsage} compact />

              {!launch.images || launch.images.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                  <Building2 className="h-10 w-10 mx-auto opacity-30 mb-2" />
                  <p className="font-semibold text-sm">Nenhuma foto adicionada ainda</p>
                  <p className="text-xs mt-1">
                    Envie imagens do empreendimento para ilustrar a Landing Page pública.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {launch.images.map((imgName, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden border aspect-4/3 group bg-slate-900"
                    >
                      <img
                        src={
                          typeof pb?.files?.getURL === 'function'
                            ? pb.files.getURL(launch, imgName)
                            : ''
                        }
                        alt={`Foto ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[11px] text-white font-medium">Foto {idx + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Nova: Materiais & Dossiê da Bia (Tabelas, PDF, Book, Manuais) */}
        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Materiais do Dossiê para a Bia
                </CardTitle>
                <CardDescription className="text-xs">
                  Faça upload de PDFs, tabelas de vendas, plantas, memoriais descritivos e manuais
                  específicos do <strong>{launch.name}</strong>. A Bia lê e absorve todo o conteúdo
                  para responder clientes no WhatsApp com precisão cirúrgica.
                </CardDescription>
              </div>

              <div className="flex items-center gap-2">
                <input
                  ref={materialFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.xls,.png,.jpg,.jpeg,.webp"
                  onChange={handleMaterialUpload}
                  className="hidden"
                  disabled={uploadingMaterial || Boolean(storageUsage?.isFull)}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (storageUsage?.isFull) {
                      toast({
                        title: 'Espaço cheio: capacidade da Bia atingida',
                        description: 'Remova arquivos antigos para liberar espaço.',
                        variant: 'destructive',
                      })
                      return
                    }
                    materialFileInputRef.current?.click()
                  }}
                  disabled={uploadingMaterial || Boolean(storageUsage?.isFull)}
                  className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {uploadingMaterial ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Indexando no Cérebro da Bia...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5" />
                      Adicionar Material (PDF / DOC)
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Barra de progresso com a cota total de 1 GB */}
              <StorageUsageBar usage={storageUsage} loading={loadingUsage} />

              {uploadingMaterial && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span>Enviando documento e extraindo o texto para a Bia ler...</span>
                </div>
              )}

              {loadingMaterials ? (
                <div className="py-8 text-center text-xs text-muted-foreground animate-pulse">
                  Carregando materiais do lançamento...
                </div>
              ) : launchKnowledgeFiles.length === 0 ? (
                <div className="text-center py-10 px-4 border-2 border-dashed rounded-xl bg-muted/10 space-y-3">
                  <FileText className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                  <div>
                    <p className="font-semibold text-sm text-foreground">
                      Nenhum material específico anexado a este lançamento ainda
                    </p>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                      Mauro, adicione aqui o PDF da tabela de preços, espelho de vendas ou memorial
                      deste lançamento. A Bia usará este documento como fonte primária ao conversar
                      com leads interessados no <strong>{launch.name}</strong>.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => materialFileInputRef.current?.click()}
                    disabled={uploadingMaterial || Boolean(storageUsage?.isFull)}
                    className="text-xs gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Selecionar Arquivos (até {MAX_SINGLE_FILE_SIZE_LABEL})
                  </Button>
                </div>
              ) : (
                <div className="divide-y border rounded-xl overflow-hidden bg-card">
                  {launchKnowledgeFiles.map((fileItem) => {
                    const fileUrl =
                      typeof pb?.files?.getURL === 'function'
                        ? pb.files.getURL(fileItem, fileItem.file)
                        : ''
                    const hasExtracted = Boolean(
                      fileItem.extracted_text && fileItem.extracted_text.trim(),
                    )
                    return (
                      <div
                        key={fileItem.id}
                        className="p-3.5 hover:bg-muted/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                          <FileText className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-foreground truncate max-w-[280px]">
                                {fileItem.name}
                              </span>
                              {hasExtracted ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4.5 bg-emerald-50 text-emerald-700 border-emerald-300"
                                >
                                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                                  Lido pela Bia
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[10px] h-4.5">
                                  Indexando
                                </Badge>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                              Tamanho:{' '}
                              {fileItem.file_size
                                ? `${(fileItem.file_size / (1024 * 1024)).toFixed(2)} MB`
                                : 'Arquivo'}{' '}
                              • Enviado em {new Date(fileItem.created).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="inline-flex"
                            >
                              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                <Download className="w-3 h-3" /> Baixar
                              </Button>
                            </a>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteMaterial(fileItem)}
                            className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                          >
                            <Trash2 className="w-3 h-3 mr-1" /> Excluir
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 5: Landing Page & CTA */}
        <TabsContent value="landing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configurações da Landing Page & WhatsApp</CardTitle>
              <CardDescription className="text-xs">
                Personalize o número de atendimento da Bia e o texto pré-configurado do botão de
                WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cta_whatsapp_number" className="text-xs">
                    Número de WhatsApp da Bia
                  </Label>
                  <Input
                    id="cta_whatsapp_number"
                    name="cta_whatsapp_number"
                    value={formData.cta_whatsapp_number}
                    onChange={handleInputChange}
                    placeholder="5548992098050"
                    className="h-9 text-xs"
                  />
                  <span className="text-[11px] text-muted-foreground block">
                    Padrão BRF Imóveis: 5548992098050
                  </span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cta_default_message" className="text-xs">
                    Mensagem Padrão do Botão CTA
                  </Label>
                  <Input
                    id="cta_default_message"
                    name="cta_default_message"
                    value={formData.cta_default_message}
                    onChange={handleInputChange}
                    placeholder={`Olá Bia! Gostaria de receber a tabela do ${launch.name} (origem: landing page ${launch.slug})`}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border space-y-2">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                  Link de Campanha Pronto para Meta Ads & Instagram:
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={publicLandingUrl}
                    className="h-9 text-xs font-mono bg-white dark:bg-slate-800"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopyLandingLink}
                    className="h-9 gap-1 text-xs shrink-0"
                  >
                    {copiedLink ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    Copiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba 6: Chat com Bia Mãe */}
        <TabsContent value="chat" className="space-y-4">
          <BiaMaeChat
            launch={launch}
            onDossierUpdated={(updated) => {
              setLaunch(updated)
              setFormData({
                name: updated.name || '',
                slug: updated.slug || '',
                enterprise_name: updated.enterprise_name || '',
                headline: updated.headline || '',
                description: updated.description || '',
                location: updated.location || '',
                payment_terms: updated.payment_terms || '',
                sales_arguments: updated.sales_arguments || '',
                specific_cadence: updated.specific_cadence || '',
                cta_whatsapp_number: updated.cta_whatsapp_number || '5548992098050',
                cta_default_message: updated.cta_default_message || '',
                differentialsText: Array.isArray(updated.differentials)
                  ? updated.differentials.join('\n')
                  : '',
                keywordsText: Array.isArray(updated.keywords) ? updated.keywords.join(', ') : '',
              })
              setUnits(Array.isArray(updated.units) ? updated.units : [])
              onUpdated(updated)
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
