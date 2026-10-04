import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Plus,
  Sparkles,
  Instagram,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Copy,
  Download,
  Trash2,
  Edit,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Send,
  Loader2,
  Building2,
  Image as ImageIcon,
  Check,
  Info,
  CalendarDays,
  UploadCloud,
  X,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  ScheduledPost,
  ScheduledPostStatus,
  getScheduledPosts,
  createScheduledPost,
  updateScheduledPost,
  deleteScheduledPost,
  duplicateScheduledPost,
  publishPostNow,
  markPostAsManuallyPublished,
  suggestPostCaptionWithBia,
  getInstagramPostStatus,
  getPostImageUrl,
  getLaunchImageUrl,
  InstagramPublishStatusResponse,
  checkPostSpacingConflict,
  getPostsWithSpacingWarning,
  getUserMinInterval,
  saveUserMinInterval,
  formatIntervalDescription,
} from '@/services/scheduled_posts'
import { getLaunches, type Launch } from '@/services/launches'
import { DRIVE_FOLDERS_DATA } from '@/data/vistage-drive-content'
import { formatStorageBytes } from '@/services/ai_knowledge_storage'
import { getErrorMessage } from '@/lib/pocketbase/errors'

export default function ScheduledPosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState<ScheduledPost[]>([])
  const [launches, setLaunches] = useState<Launch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusInfo, setStatusInfo] = useState<InstagramPublishStatusResponse | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date())

  // Configuração de intervalo mínimo anti-saturação
  const [minIntervalMinutes, setMinIntervalMinutes] = useState<number>(60)
  const [isUpdatingInterval, setIsUpdatingInterval] = useState(false)

  // Modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Campos do formulário
  const [caption, setCaption] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('11:00')
  const [linkCta, setLinkCta] = useState('')
  const [postStatus, setPostStatus] = useState<ScheduledPostStatus>('agendado')
  const [selectedLaunchId, setSelectedLaunchId] = useState<string>('none')
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [selectedLaunchImages, setSelectedLaunchImages] = useState<string[]>([])

  // Modal da Bia (IA)
  const [isBiaGenerating, setIsBiaGenerating] = useState(false)
  const [biaPrompt, setBiaPrompt] = useState('')
  const [biaTone, setBiaTone] = useState('engajador')

  // Ações de publicação e cópia
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null)

  // Carregar dados iniciais
  const loadData = async () => {
    try {
      setLoading(true)
      const [fetchedPosts, fetchedLaunches, fetchedStatus, fetchedInterval] = await Promise.all([
        getScheduledPosts(),
        getLaunches(),
        getInstagramPostStatus(),
        getUserMinInterval(user?.id),
      ])
      setPosts(fetchedPosts)
      setLaunches(fetchedLaunches)
      setStatusInfo(fetchedStatus)
      setMinIntervalMinutes(fetchedInterval)
    } catch (err) {
      console.error('Erro ao carregar agenda de posts:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os posts agendados.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Atualizar preferência de espaçamento mínimo do usuário
  const handleIntervalChange = async (valStr: string) => {
    const minutes = parseInt(valStr, 10)
    if (isNaN(minutes)) return
    setMinIntervalMinutes(minutes)
    if (!user?.id) return

    try {
      setIsUpdatingInterval(true)
      await saveUserMinInterval(user.id, minutes)
      toast({
        title: 'Espaçamento mínimo atualizado! ⏱️',
        description: `Novo intervalo configurado para ${formatIntervalDescription(minutes)}. Seus próximos posts respeitarão esta regra.`,
      })
    } catch (err) {
      console.error('Erro ao salvar intervalo:', err)
      toast({
        title: 'Erro ao salvar configuração',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingInterval(false)
    }
  }

  // Validação em tempo real de conflito de espaçamento no modal
  const proposedFullScheduledAt = useMemo(() => {
    if (!scheduledDate || !scheduledTime) return ''
    return `${scheduledDate} ${scheduledTime}:00`
  }, [scheduledDate, scheduledTime])

  const currentSpacingConflict = useMemo(() => {
    if (postStatus !== 'agendado' || !proposedFullScheduledAt) {
      return {
        hasConflict: false,
        intervalMinutes: minIntervalMinutes,
        intervalDesc: formatIntervalDescription(minIntervalMinutes),
      }
    }
    return checkPostSpacingConflict(
      proposedFullScheduledAt,
      posts,
      minIntervalMinutes,
      editingPost ? editingPost.id : undefined,
    )
  }, [proposedFullScheduledAt, posts, minIntervalMinutes, editingPost, postStatus])

  // Identificar posts que já estão muito próximos entre si no banco para badge de aviso
  const postsWithWarning = useMemo(() => {
    return getPostsWithSpacingWarning(posts, minIntervalMinutes)
  }, [posts, minIntervalMinutes])

  // Inicializar data padrão (amanhã 11:00) ao abrir para novo post
  const openNewPostModal = (defaultDate?: Date) => {
    setEditingPost(null)
    const target = defaultDate || new Date(Date.now() + 24 * 60 * 60 * 1000)
    const yyyy = target.getFullYear()
    const mm = String(target.getMonth() + 1).padStart(2, '0')
    const dd = String(target.getDate()).padStart(2, '0')
    setScheduledDate(`${yyyy}-${mm}-${dd}`)
    setScheduledTime('11:00')
    setCaption('')
    setLinkCta('https://www.brfimoveis.com.br/vistage')
    setPostStatus('agendado')
    setSelectedLaunchId('none')
    setImageFiles([])
    setImagePreviews([])
    setSelectedLaunchImages([])
    setBiaPrompt('')
    setIsModalOpen(true)
  }

  const openEditPostModal = (post: ScheduledPost) => {
    setEditingPost(post)
    let dStr = ''
    let tStr = '11:00'
    if (post.scheduled_at) {
      const parts = post.scheduled_at.split('T')
      dStr = parts[0] || ''
      if (parts[1]) {
        tStr = parts[1].slice(0, 5)
      } else {
        const spaceParts = post.scheduled_at.split(' ')
        dStr = spaceParts[0] || ''
        tStr = spaceParts[1] ? spaceParts[1].slice(0, 5) : '11:00'
      }
    }
    setScheduledDate(dStr)
    setScheduledTime(tStr)
    setCaption(post.caption || '')
    setLinkCta(post.link_cta || '')
    setPostStatus(post.status || 'agendado')
    setSelectedLaunchId(post.launch || 'none')
    setImageFiles([])
    setImagePreviews([])
    setSelectedLaunchImages(post.image_urls || [])
    setBiaPrompt('')
    setIsModalOpen(true)
  }

  // Manipular upload de arquivos com validação de formato e preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const incoming = Array.from(e.target.files)
    setImageFiles((prev) => [...prev, ...incoming])

    // Gerar previews
    incoming.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImagePreviews((prev) => [...prev, String(ev.target?.result)])
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeNewFile = (idx: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== idx))
    setImagePreviews((prev) => prev.filter((_, i) => i !== idx))
  }

  const removeLaunchImage = (idx: number) => {
    setSelectedLaunchImages((prev) => prev.filter((_, i) => i !== idx))
  }

  // Sugestão de legenda com a Bia
  const handleSuggestCaption = async () => {
    try {
      setIsBiaGenerating(true)
      const res = await suggestPostCaptionWithBia(
        selectedLaunchId !== 'none' ? selectedLaunchId : undefined,
        biaPrompt,
        biaTone,
      )
      if (res.success && res.caption) {
        setCaption(res.caption)
        toast({
          title: 'Legenda gerada pela Bia! ✨',
          description: res.launch_used
            ? `Inspirada no lançamento ${res.launch_used}.`
            : 'Legenda imobiliária personalizada criada com sucesso.',
        })
      } else {
        toast({
          title: 'Aviso da Bia',
          description: 'Não foi possível gerar a legenda no momento.',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      console.error('Erro Bia IA:', err)
      toast({
        title: 'Falha ao consultar a Bia',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsBiaGenerating(false)
    }
  }

  // Selecionar lançamento e pré-preencher imagens e CTA sugerido
  const handleSelectLaunch = (launchId: string) => {
    setSelectedLaunchId(launchId)
    if (launchId === 'none') return

    const selectedLaunch = launches.find((l) => l.id === launchId)
    if (!selectedLaunch) return

    // Preencher link CTA sugerido
    if (selectedLaunch.slug) {
      setLinkCta(`https://www.brfimoveis.com.br/l/${selectedLaunch.slug}`)
    }

    // Se o lançamento tiver imagens cadastradas no PocketBase, adiciona às selecionadas
    if (Array.isArray(selectedLaunch.images) && selectedLaunch.images.length > 0) {
      const urls = selectedLaunch.images.map((img) => getLaunchImageUrl(selectedLaunch.id, img))
      setSelectedLaunchImages((prev) => Array.from(new Set([...prev, ...urls])))
    }
  }

  // Salvar post (Create ou Update)
  const handleSavePost = async () => {
    const trimmedCaption = caption.trim()

    // Validação estrita de campos essenciais antes de enviar ao servidor
    if (!trimmedCaption) {
      toast({
        title: 'Legenda obrigatória',
        description: 'Preencha a legenda do post para agendar.',
        variant: 'destructive',
      })
      return
    }

    if (!scheduledDate) {
      toast({
        title: 'Data obrigatória',
        description: 'Escolha a data programada para o post.',
        variant: 'destructive',
      })
      return
    }

    if (!scheduledTime) {
      toast({
        title: 'Horário obrigatório',
        description: 'Informe o horário de publicação do post.',
        variant: 'destructive',
      })
      return
    }

    const fullScheduledAt = `${scheduledDate} ${scheduledTime}:00`

    // Validação de proteção anti-saturação no frontend
    if (postStatus === 'agendado') {
      const conflictCheck = checkPostSpacingConflict(
        fullScheduledAt,
        posts,
        minIntervalMinutes,
        editingPost ? editingPost.id : undefined,
      )
      if (conflictCheck.hasConflict) {
        toast({
          title: 'Horário conflitante (Anti-Saturação)',
          description: conflictCheck.errorMessage,
          variant: 'destructive',
        })
        return
      }
    }

    try {
      setIsSaving(true)
      if (editingPost) {
        await updateScheduledPost(editingPost.id, {
          launch: selectedLaunchId !== 'none' ? selectedLaunchId : undefined,
          caption: trimmedCaption,
          scheduled_at: fullScheduledAt,
          status: postStatus,
          link_cta: linkCta.trim(),
          image_files: imageFiles.length > 0 ? imageFiles : undefined,
          image_urls: selectedLaunchImages,
        })
        toast({
          title: 'Post atualizado com sucesso! 📅',
          description: `Programado para ${scheduledDate} às ${scheduledTime}.`,
        })
      } else {
        await createScheduledPost({
          launch: selectedLaunchId !== 'none' ? selectedLaunchId : undefined,
          caption: trimmedCaption,
          scheduled_at: fullScheduledAt,
          status: postStatus,
          link_cta: linkCta.trim(),
          image_files: imageFiles,
          image_urls: selectedLaunchImages,
          created_by: user?.email || user?.name || 'Mauro',
        })
        toast({
          title: 'Post agendado com sucesso! 🎉',
          description: `Programado para ${scheduledDate} às ${scheduledTime}. Acompanhe pelo calendário.`,
        })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error('Erro ao salvar post:', err)
      toast({
        title: 'Erro ao salvar post',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Publicar agora
  const handlePublishNow = async (post: ScheduledPost) => {
    try {
      setPublishingId(post.id)
      const res = await publishPostNow(post.id)
      if (res.success) {
        toast({
          title: 'Publicado no Instagram! 🚀',
          description: 'A mídia já está no ar na conta comercial.',
        })
      } else {
        toast({
          title: 'Aviso de publicação (Modo Manual Ativo)',
          description:
            res.message ||
            'A Meta recusou a publicação direta (permissão em andamento). Use a publicação manual!',
          variant: 'destructive',
        })
      }
      loadData()
    } catch (err: any) {
      console.error('Erro publish now:', err)
      toast({
        title: 'Falha na publicação',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setPublishingId(null)
    }
  }

  // Marcar como publicado manualmente
  const handleMarkManualPublished = async (post: ScheduledPost) => {
    try {
      await markPostAsManuallyPublished(post.id)
      toast({
        title: 'Post marcado como publicado! ✅',
        description: 'Status atualizado com sucesso no cronograma.',
      })
      loadData()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // Duplicar post
  const handleDuplicate = async (post: ScheduledPost) => {
    try {
      const defaultDuplicateDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      // Validar se o horário padrão de amanhã tem conflito
      const conflictCheck = checkPostSpacingConflict(
        defaultDuplicateDate,
        posts,
        minIntervalMinutes,
      )

      let targetDateStr = defaultDuplicateDate
      if (conflictCheck.hasConflict && conflictCheck.suggestedNextIso) {
        targetDateStr = conflictCheck.suggestedNextIso
      }

      await duplicateScheduledPost(post, targetDateStr)
      toast({
        title: 'Post duplicado com sucesso! 📋',
        description: conflictCheck.hasConflict
          ? `Uma cópia foi programada para ${conflictCheck.suggestedNextDateStr} às ${conflictCheck.suggestedNextTime} (ajustada para respeitar o intervalo mínimo).`
          : 'Uma cópia foi programada para amanhã no mesmo horário.',
      })
      loadData()
    } catch (err: any) {
      toast({
        title: 'Erro ao duplicar post',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // Excluir post
  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este post agendado?')) return
    try {
      await deleteScheduledPost(id)
      toast({
        title: 'Post excluído com sucesso! 🗑️',
        description: 'O agendamento foi removido definitivamente.',
      })
      loadData()
    } catch (err) {
      toast({
        title: 'Erro ao excluir post',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  // Copiar legenda completa
  const copyPostCaption = (post: ScheduledPost) => {
    let text = post.caption || ''
    if (post.link_cta) {
      text += `\n\n🔗 Saiba mais: ${post.link_cta}`
    }
    navigator.clipboard.writeText(text)
    setCopiedPostId(post.id)
    toast({
      title: 'Legenda copiada! 📋',
      description: 'Texto pronto para colar no Instagram.',
    })
    setTimeout(() => setCopiedPostId(null), 2500)
  }

  // Baixar imagem do post
  const downloadPostImage = (post: ScheduledPost) => {
    const imgUrl = getPostImageUrl(post)
    if (!imgUrl) {
      toast({
        title: 'Sem imagem',
        description: 'Este post não possui imagem para download.',
        variant: 'destructive',
      })
      return
    }
    const a = document.createElement('a')
    a.href = imgUrl
    a.download = `post-brf-${post.id}.jpg`
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast({
      title: 'Download iniciado',
      description: 'A imagem foi aberta para download.',
    })
  }

  // Badge visual de status
  const getStatusBadge = (status: ScheduledPostStatus) => {
    switch (status) {
      case 'publicado':
        return (
          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 flex items-center">
            <CheckCircle2 className="w-3 h-3" /> Publicado
          </Badge>
        )
      case 'agendado':
        return (
          <Badge className="bg-blue-600 hover:bg-blue-700 text-white gap-1 flex items-center">
            <Clock className="w-3 h-3" /> Agendado
          </Badge>
        )
      case 'falhou':
        return (
          <Badge className="bg-rose-600 hover:bg-rose-700 text-white gap-1 flex items-center">
            <AlertTriangle className="w-3 h-3" /> Falhou
          </Badge>
        )
      case 'rascunho':
      default:
        return (
          <Badge
            variant="outline"
            className="text-slate-600 border-slate-300 gap-1 flex items-center"
          >
            <FileText className="w-3 h-3" /> Rascunho
          </Badge>
        )
    }
  }

  // Lógica de Calendário Mensal
  const year = selectedMonth.getFullYear()
  const month = selectedMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Domingo

  const prevMonth = () => setSelectedMonth(new Date(year, month - 1, 1))
  const nextMonth = () => setSelectedMonth(new Date(year, month + 1, 1))
  const currentMonthName = selectedMonth.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  // Agrupar posts por data YYYY-MM-DD
  const postsByDate = useMemo(() => {
    const map: Record<string, ScheduledPost[]> = {}
    posts.forEach((p) => {
      if (!p.scheduled_at) return
      const datePart = p.scheduled_at.split('T')[0]?.split(' ')[0]
      if (!datePart) return
      if (!map[datePart]) map[datePart] = []
      map[datePart].push(p)
    })
    return map
  }, [posts])

  // Resumo de contadores
  const stats = useMemo(() => {
    const total = posts.length
    const agendados = posts.filter((p) => p.status === 'agendado').length
    const publicados = posts.filter((p) => p.status === 'publicado').length
    const falhados = posts.filter((p) => p.status === 'falhou').length
    return { total, agendados, publicados, falhados }
  }, [posts])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-tr from-pink-500 to-purple-600 text-white rounded-lg shadow-sm">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                Agenda de Posts Instagram
                <Badge
                  variant="outline"
                  className="text-xs bg-pink-50 text-pink-700 border-pink-200"
                >
                  Piloto Instagram
                </Badge>
              </h1>
              <p className="text-sm text-slate-500">
                Programe posts para o mês inteiro, gere legendas com a Bia e gerencie o fluxo manual
                ou automático.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Intervalo Mínimo Anti-Saturação */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-slate-600 font-medium whitespace-nowrap flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Espaçamento:
            </span>
            <Select
              value={String(minIntervalMinutes)}
              onValueChange={handleIntervalChange}
              disabled={isUpdatingInterval}
            >
              <SelectTrigger className="h-7 text-xs bg-white border-slate-200 w-[110px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora (padrão)</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <TabsList className="grid grid-cols-2 w-[190px]">
              <TabsTrigger value="calendar" className="flex items-center gap-1.5 text-xs">
                <CalendarIcon className="w-3.5 h-3.5" /> Calendário
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-1.5 text-xs">
                <ListIcon className="w-3.5 h-3.5" /> Lista
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            onClick={() => openNewPostModal()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" /> Novo Post
          </Button>
        </div>
      </div>

      {/* Banner de Status da Integração (Automático vs Modo Degradado/Manual) */}
      {statusInfo && !statusInfo.can_auto_publish && (
        <Alert className="bg-amber-50 border-amber-200 text-amber-900">
          <Info className="h-5 w-5 text-amber-600" />
          <AlertTitle className="font-semibold text-amber-900 flex items-center gap-2">
            Modo de Publicação Assistida (Fluxo Manual Disponível)
          </AlertTitle>
          <AlertDescription className="text-sm text-amber-800 space-y-2 mt-1">
            <p>
              A publicação direta via API da Meta aguarda a aprovação da permissão{' '}
              <code className="bg-amber-100 text-amber-950 px-1 py-0.5 rounded text-xs font-mono">
                instagram_content_publish
              </code>{' '}
              e a finalização do vínculo Instagram↔Página.
            </p>
            <p className="font-medium">
              👉 O sistema continua 100% funcional para você programar seu mês todo! Em cada post,
              use os botões rápidos:
              <strong> "Copiar Legenda"</strong> + <strong>"Baixar Foto"</strong> para postar no
              Instagram em 10 segundos, e marque como <strong>"Publicado"</strong>.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {statusInfo && statusInfo.can_auto_publish && (
        <Alert className="bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <AlertTitle className="font-semibold text-emerald-900">
            Publicação Automática Ativa ✅
          </AlertTitle>
          <AlertDescription className="text-sm text-emerald-800">
            Conectado à conta <strong>@{statusInfo.instagram_username}</strong>. O cron do CRM
            verifica a cada 5 minutos e dispara os posts agendados automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Programado</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 rounded-lg text-slate-700">
              <CalendarDays className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Agendados</p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">{stats.agendados}</h3>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Publicados</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.publicados}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-slate-200 shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Atenção / Falhas</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">{stats.falhados}</h3>
            </div>
            <div className="p-2.5 bg-rose-50 rounded-lg text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteúdo Principal: Visualização Calendário ou Lista */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-3" />
          <p className="text-sm text-slate-500">Carregando cronograma de publicações...</p>
        </div>
      ) : viewMode === 'calendar' ? (
        /* VISUALIZAÇÃO EM CALENDÁRIO */
        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-200 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold text-slate-800 capitalize min-w-[180px] text-center">
                {currentMonthName}
              </h2>
              <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedMonth(new Date())}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Mês Atual
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-500">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
                <div key={day} className="py-2.5 border-r border-slate-200 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Células dos dias */}
            <div className="grid grid-cols-7 auto-rows-fr bg-slate-100 gap-px">
              {/* Espaços vazios antes do 1º dia */}
              {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[110px] bg-slate-50/50 p-1.5 opacity-40" />
              ))}

              {/* Dias do mês */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNumber = i + 1
                const curDate = new Date(year, month, dayNumber)
                const yyyy = curDate.getFullYear()
                const mm = String(curDate.getMonth() + 1).padStart(2, '0')
                const dd = String(dayNumber).padStart(2, '0')
                const dateKey = `${yyyy}-${mm}-${dd}`
                const dayPosts = postsByDate[dateKey] || []

                const isToday = new Date().toDateString() === curDate.toDateString()

                return (
                  <div
                    key={dateKey}
                    className={`min-h-[120px] bg-white p-2 transition-colors flex flex-col justify-between group hover:bg-slate-50/80 ${
                      isToday ? 'ring-2 ring-emerald-500 ring-inset bg-emerald-50/20' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs font-semibold rounded-full w-6 h-6 flex items-center justify-center ${
                          isToday ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-700'
                        }`}
                      >
                        {dayNumber}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-emerald-600 transition-opacity"
                        onClick={() => openNewPostModal(curDate)}
                        title="Agendar post neste dia"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>

                    {/* Lista de posts no dia */}
                    <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[110px]">
                      {dayPosts.map((post) => {
                        const imgUrl = getPostImageUrl(post)
                        return (
                          <div
                            key={post.id}
                            onClick={() => openEditPostModal(post)}
                            className="cursor-pointer border border-slate-200 rounded p-1.5 hover:shadow-xs bg-white text-xs space-y-1 transition-all hover:border-emerald-300"
                          >
                            <div className="flex items-center gap-1.5">
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt="Thumb"
                                  className="w-5 h-5 rounded object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                                  <ImageIcon className="w-3 h-3" />
                                </div>
                              )}
                              <span className="font-medium text-slate-800 truncate flex-1">
                                {post.caption ? post.caption.slice(0, 25) + '...' : 'Sem legenda'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>
                                {post.scheduled_at?.split(' ')[1]?.slice(0, 5) || '11:00'}
                              </span>
                              {postsWithWarning.has(post.id) && (
                                <span
                                  className="text-[9px] text-amber-700 bg-amber-100 font-medium px-1 rounded flex items-center gap-0.5"
                                  title="⚠️ Muito próximo de outro post agendado"
                                >
                                  ⚠️ próximo
                                </span>
                              )}
                              {post.status === 'publicado' ? (
                                <span className="text-emerald-600 font-medium">Publicado</span>
                              ) : post.status === 'falhou' ? (
                                <span className="text-rose-600 font-medium">Falhou</span>
                              ) : (
                                <span className="text-blue-600">Agendado</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* VISUALIZAÇÃO EM LISTA */
        <div className="space-y-3">
          {posts.length === 0 ? (
            <Card className="p-12 text-center bg-white border-dashed border-2 border-slate-200">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-800">Nenhum post agendado</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Comece programando seus posts para o Instagram deste mês com fotos e legendas
                sugeridas pela Bia.
              </p>
              <Button
                onClick={() => openNewPostModal()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Criar Primeiro Post
              </Button>
            </Card>
          ) : (
            posts.map((post) => {
              const imgUrl = getPostImageUrl(post)
              return (
                <Card
                  key={post.id}
                  className="bg-white border-slate-200 hover:border-slate-300 transition-all shadow-xs"
                >
                  <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    {/* Thumbnail + Detalhes */}
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {imgUrl ? (
                        <img
                          src={imgUrl}
                          alt="Post preview"
                          className="w-20 h-20 rounded-lg object-cover border border-slate-200 shadow-xs flex-shrink-0"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-lg bg-slate-100 flex flex-col items-center justify-center text-slate-400 border border-slate-200 flex-shrink-0">
                          <ImageIcon className="w-6 h-6 mb-1" />
                          <span className="text-[10px]">Sem foto</span>
                        </div>
                      )}

                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {getStatusBadge(post.status)}
                          {postsWithWarning.has(post.id) && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-amber-50 text-amber-800 border-amber-300 gap-1 font-medium"
                              title="Este post está a menos que o intervalo mínimo configurado em relação a outro post agendado"
                            >
                              ⚠️ muito próximo de outro post
                            </Badge>
                          )}
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {post.scheduled_at
                              ? new Date(post.scheduled_at).toLocaleString('pt-BR')
                              : 'Data não definida'}
                          </span>
                          {post.expand?.launch && (
                            <Badge
                              variant="outline"
                              className="text-slate-600 bg-slate-50 border-slate-200 gap-1 text-[11px]"
                            >
                              <Building2 className="w-3 h-3 text-emerald-600" />
                              {post.expand.launch.name}
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-slate-800 line-clamp-2 leading-relaxed">
                          {post.caption || (
                            <span className="text-slate-400 italic">Sem legenda cadastrada</span>
                          )}
                        </p>

                        {post.link_cta && (
                          <p className="text-xs text-emerald-600 truncate flex items-center gap-1 font-mono">
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                            {post.link_cta}
                          </p>
                        )}

                        {post.status === 'falhou' && post.error_message && (
                          <p className="text-xs text-rose-600 bg-rose-50 p-1.5 rounded border border-rose-200">
                            <strong>Motivo:</strong> {post.error_message}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Ações Rápidas */}
                    <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-end border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                      {/* Modo manual: Copiar legenda + Baixar imagem */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyPostCaption(post)}
                        className="text-xs gap-1 border-slate-200"
                        title="Copiar texto e link formatado"
                      >
                        {copiedPostId === post.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copiar Legenda
                          </>
                        )}
                      </Button>

                      {imgUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadPostImage(post)}
                          className="text-xs gap-1 border-slate-200"
                          title="Baixar imagem original para postar"
                        >
                          <Download className="w-3.5 h-3.5" /> Foto
                        </Button>
                      )}

                      {/* Publicar agora (API ou marcar como postado) */}
                      {post.status !== 'publicado' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handlePublishNow(post)}
                            disabled={publishingId === post.id}
                            className="bg-pink-600 hover:bg-pink-700 text-white text-xs gap-1 shadow-xs"
                          >
                            {publishingId === post.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Publicar Agora
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMarkManualPublished(post)}
                            className="text-xs text-emerald-700 hover:bg-emerald-50"
                            title="Marcar como publicado se você já postou pelo celular"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Já Postei
                          </Button>
                        </>
                      )}

                      {/* Duplicar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDuplicate(post)}
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        title="Duplicar para outro dia"
                      >
                        <Copy className="w-4 h-4" />
                      </Button>

                      {/* Editar */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditPostModal(post)}
                        className="h-8 w-8 text-slate-400 hover:text-slate-700"
                        title="Editar post"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>

                      {/* Excluir */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(post.id)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        title="Excluir post"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* DIALOG DE CRIAÇÃO / EDIÇÃO DE POST */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Instagram className="w-5 h-5 text-pink-600" />
              {editingPost ? 'Editar Post Programado' : 'Novo Post no Instagram'}
            </DialogTitle>
            <DialogDescription>
              Configure data, imagens e legenda. Você pode pedir ajuda à Bia para criar textos que
              convertem.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Lançamento vinculado (opcional) */}
            <div className="space-y-1.5">
              <Label
                htmlFor="launch-select"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                Vincular a um Lançamento Imobiliário (Opcional)
              </Label>
              <Select value={selectedLaunchId} onValueChange={handleSelectLaunch}>
                <SelectTrigger id="launch-select" className="bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Selecione um lançamento..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Post Institucional / Imóvel Avulso)</SelectItem>
                  {launches.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} {l.enterprise_name ? `— ${l.enterprise_name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Ao selecionar um lançamento, a Bia puxa automaticamente os argumentos, fotos e o
                link da landing page.
              </p>
            </div>

            {/* Galeria de Fotos: Upload + Fotos do Lançamento */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                  Foto(s) do Post (Suporta JPG, PNG, WEBP — Cota Bia 1 GB)
                </span>
                <span className="text-[11px] font-normal text-slate-400">
                  {imagePreviews.length + selectedLaunchImages.length} imagem(ns) selecionada(s)
                </span>
              </Label>

              {/* Previews existentes / adicionados */}
              <div className="flex flex-wrap gap-2 items-center">
                {/* Imagens do lançamento vinculadas */}
                {selectedLaunchImages.map((url, idx) => (
                  <div
                    key={`launch-img-${idx}`}
                    className="relative group w-20 h-20 rounded-lg border border-slate-200 overflow-hidden"
                  >
                    <img src={url} alt="Launch asset" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeLaunchImage(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-emerald-700/80 text-[9px] text-white text-center py-0.5">
                      Lançamento
                    </span>
                  </div>
                ))}

                {/* Imagens novas via upload */}
                {imagePreviews.map((url, idx) => (
                  <div
                    key={`upload-img-${idx}`}
                    className="relative group w-20 h-20 rounded-lg border border-slate-200 overflow-hidden"
                  >
                    <img src={url} alt="Upload preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewFile(idx)}
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <span className="absolute bottom-0 inset-x-0 bg-blue-700/80 text-[9px] text-white text-center py-0.5">
                      Novo arquivo
                    </span>
                  </div>
                ))}

                {/* Botão de upload */}
                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 flex flex-col items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-emerald-700">
                  <UploadCloud className="w-5 h-5 mb-1" />
                  <span className="text-[10px] font-medium">Upload</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Bloco de Legenda + Botão "Sugerir com a Bia" */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="post-caption" className="text-xs font-semibold text-slate-700">
                  Legenda do Post
                </Label>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] ${
                      caption.length > 2200 ? 'text-rose-600 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {caption.length} / 2.200 caracteres (Instagram)
                  </span>
                </div>
              </div>

              {/* Caixa da Bia Assistente de Legenda */}
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Cérebro da Bia: Gerador de Legenda de Alta Conversão
                  </span>
                  <Select value={biaTone} onValueChange={setBiaTone}>
                    <SelectTrigger className="h-7 text-xs bg-white border-purple-200 w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engajador">Engajador & Sofisticado</SelectItem>
                      <SelectItem value="luxo">Alto Padrão / Exclusivo</SelectItem>
                      <SelectItem value="investidor">Foco em Rentabilidade</SelectItem>
                      <SelectItem value="urgencia">Lançamento / Urgência</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Instrução opcional para a Bia (ex: destacar piscina na cobertura ou parcelamento)..."
                    value={biaPrompt}
                    onChange={(e) => setBiaPrompt(e.target.value)}
                    className="h-8 text-xs bg-white border-purple-200"
                  />
                  <Button
                    type="button"
                    onClick={handleSuggestCaption}
                    disabled={isBiaGenerating}
                    size="sm"
                    className="h-8 bg-purple-700 hover:bg-purple-800 text-white text-xs gap-1 flex-shrink-0 shadow-xs"
                  >
                    {isBiaGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {caption ? 'Recriar Legenda' : 'Sugerir com a Bia'}
                  </Button>
                </div>
              </div>

              <Textarea
                id="post-caption"
                rows={6}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Escreva a legenda do post ou clique no botão acima para a Bia redigir..."
                className="text-sm font-sans leading-relaxed border-slate-200"
              />
            </div>

            {/* Link / CTA Opcional */}
            <div className="space-y-1.5">
              <Label
                htmlFor="post-link"
                className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                Link de Destino / CTA (adicionado ao final da legenda)
              </Label>
              <Input
                id="post-link"
                value={linkCta}
                onChange={(e) => setLinkCta(e.target.value)}
                placeholder="ex: https://www.brfimoveis.com.br/vistage ou /site"
                className="text-xs font-mono border-slate-200 bg-slate-50"
              />
              <div className="flex gap-2 text-[11px] text-slate-500">
                <span>Atalhos rápidos:</span>
                <button
                  type="button"
                  onClick={() => setLinkCta('https://www.brfimoveis.com.br/vistage')}
                  className="text-emerald-700 hover:underline"
                >
                  Landing Vistage
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setLinkCta('https://www.brfimoveis.com.br')}
                  className="text-emerald-700 hover:underline"
                >
                  Site Oficial
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => setLinkCta('https://wa.me/5548992098050')}
                  className="text-emerald-700 hover:underline"
                >
                  WhatsApp da Bia
                </button>
              </div>
            </div>

            {/* Data e Hora de Programação */}
            <div className="space-y-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="post-date" className="text-xs font-semibold text-slate-700">
                    Data de Publicação
                  </Label>
                  <Input
                    id="post-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="post-time" className="text-xs font-semibold text-slate-700">
                    Horário Previsto
                  </Label>
                  <Input
                    id="post-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="h-9 text-xs bg-white border-slate-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor="post-status-select"
                    className="text-xs font-semibold text-slate-700"
                  >
                    Status
                  </Label>
                  <Select value={postStatus} onValueChange={(v: any) => setPostStatus(v)}>
                    <SelectTrigger
                      id="post-status-select"
                      className="h-9 text-xs bg-white border-slate-200"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agendado">Agendado (Cron Automático)</SelectItem>
                      <SelectItem value="rascunho">Rascunho (Não Disparar)</SelectItem>
                      <SelectItem value="publicado">Publicado (Manual/Já Feito)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Texto de Ajuda da Regra de Anti-Saturação */}
              <div className="pt-2 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  Proteção anti-saturação: posts com no mínimo{' '}
                  {formatIntervalDescription(minIntervalMinutes)} de intervalo (alterável).
                </span>
                <span className="text-[10px] text-slate-400">
                  Evita que posts saiam colados no feed do Instagram.
                </span>
              </div>

              {/* Alerta de Conflito em tempo real com sugestão clicável do próximo horário livre */}
              {currentSpacingConflict.hasConflict && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-800 space-y-1.5 animate-in fade-in">
                  <div className="flex items-start gap-1.5 font-medium">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{currentSpacingConflict.errorMessage}</span>
                  </div>
                  {currentSpacingConflict.suggestedNextTime && (
                    <div className="flex items-center gap-2 pl-5 pt-0.5">
                      <span className="text-[11px] text-rose-700">Sugestão:</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (currentSpacingConflict.suggestedNextTime) {
                            setScheduledTime(currentSpacingConflict.suggestedNextTime)
                          }
                          if (currentSpacingConflict.suggestedNextDateStr) {
                            setScheduledDate(currentSpacingConflict.suggestedNextDateStr)
                          }
                        }}
                        className="h-6 px-2 text-xs bg-white border-rose-300 text-rose-900 hover:bg-rose-100 hover:text-rose-950 font-semibold shadow-2xs"
                      >
                        Usar {currentSpacingConflict.suggestedNextTime}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="border-t border-slate-200 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSaving}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSavePost}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
            >
              {isSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              {editingPost ? 'Salvar Alterações' : 'Agendar Post'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
