import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Save,
  Key,
  Settings as SettingsIcon,
  ShieldCheck,
  CheckCircle2,
  Facebook,
  Loader2,
  Activity,
  FileText,
  Globe,
  Tags,
  Bot,
  Paperclip,
  Upload,
  Trash2,
  MapPin,
  Briefcase,
  Headset,
  Volume2,
  Info,
  Mic,
  User,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'
import { useBlocker } from 'react-router-dom'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useRealtime } from '@/hooks/use-realtime'
import { getCadences, updateCadence, type Cadence } from '@/services/cadences'
import {
  getFirstKnowledgeBaseEntry,
  createKnowledgeBaseEntry,
  updateKnowledgeBaseEntry,
  KnowledgeBaseEntry,
} from '@/services/knowledge_base'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DiagnosticCenter } from '@/components/DiagnosticCenter'
import { RecentPerformance } from '@/components/RecentPerformance'
import { LeadOriginsDashboard } from '@/components/LeadOriginsDashboard'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

const VOICE_PROFILES = [
  {
    id: 'bia_executiva',
    name: 'Bia Executiva',
    tone: 'Madura, pausada e autoritária',
    stability: 75,
    clarity: 80,
  },
  {
    id: 'bia_amiga',
    name: 'Bia Amiga',
    tone: 'Jovem, dinâmica e entusiasmada',
    stability: 45,
    clarity: 90,
  },
  {
    id: 'bia_consultora',
    name: 'Bia Consultora',
    tone: 'Equilibrada, empática e segura',
    stability: 60,
    clarity: 85,
  },
]

const AVATAR_STYLES = [
  {
    id: 'foco_regional',
    name: 'Foco Regional',
    description:
      'Visual de corretora local, fundo com praias ou centros urbanos de Biguaçu/Floripa',
    query: 'female%20realtor%20beach',
    icon: MapPin,
  },
  {
    id: 'foco_luxo',
    name: 'Foco Luxo',
    description:
      'Trajes executivos mais formais, fundo de escritório moderno ou decorado do Villa dos Açores',
    query: 'female%20executive%20modern%20office',
    icon: Briefcase,
  },
  {
    id: 'foco_agilidade',
    name: 'Foco Agilidade',
    description:
      'Visual moderno, com fone de ouvido estilo "central de inteligência", reforçando o suporte 24h',
    query: 'modern%20female%20support%20agent%20headset',
    icon: Headset,
  },
]

export default function Settings() {
  const { toast } = useToast()
  const { user } = useAuth()

  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)

  // Meta Ads State
  const [metaPixelId, setMetaPixelId] = useState('')
  const [metaTestEventCode, setMetaTestEventCode] = useState('')
  const [metaCapiToken, setMetaCapiToken] = useState('')
  const [metaTagsList, setMetaTagsList] = useState<{ id: string; name: string }[]>([])
  const [metaCampaignPhone, setMetaCampaignPhone] = useState('')

  // AI Identity & Knowledge Base State
  const [prompt, setPrompt] = useState('')
  const [aiName, setAiName] = useState('Bia')
  const [aiVoiceId, setAiVoiceId] = useState('bia_consultora')
  const [aiAvatarStyle, setAiAvatarStyle] = useState('foco_luxo')
  const [aiAvatarFile, setAiAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [kbEntry, setKbEntry] = useState<KnowledgeBaseEntry | null>(null)
  const [site, setSite] = useState('')
  const [tags, setTags] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // UI State
  const [newTagName, setNewTagName] = useState('')
  const [newTagId, setNewTagId] = useState('')
  const [gtmStatus, setGtmStatus] = useState<'checking' | 'active' | 'error'>('checking')
  const [lastFbTraceId, setLastFbTraceId] = useState('')
  const [lastErrorMsg, setLastErrorMsg] = useState('')
  const [lastErrorCode, setLastErrorCode] = useState<number | string>('')

  const [uazapiDomain, setUazapiDomain] = useState('')
  const [uazapiToken, setUazapiToken] = useState('')

  const [initialState, setInitialState] = useState({
    pixel: '',
    test: '',
    capiToken: '',
    tags: '[]',
    prompt: '',
    aiName: '',
    aiVoiceId: '',
    aiAvatarStyle: '',
    campaignPhone: '',
    site: '',
    kbTags: '',
    uazapiDomain: '',
    uazapiToken: '',
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Cadence Audit State
  const [cadences, setCadences] = useState<Cadence[]>([])
  const [editingCadence, setEditingCadence] = useState<Cadence | null>(null)
  const [editAiInstructions, setEditAiInstructions] = useState('')
  const [isSavingCadence, setIsSavingCadence] = useState(false)
  const [isTestingUazapi, setIsTestingUazapi] = useState(false)

  useEffect(() => {
    const loadCadences = async () => {
      try {
        const data = await getCadences()
        setCadences(data)
      } catch (error) {
        console.error('Failed to load cadences:', error)
      }
    }
    const loadKb = async () => {
      if (user?.id) {
        const entry = await getFirstKnowledgeBaseEntry(user.id)
        if (entry) {
          setKbEntry(entry)
          setSite(entry.site || '')
          setTags(entry.tags || '')
        }
      }
    }

    if (user) {
      loadCadences()
      loadKb()
    }
  }, [user])

  useRealtime('cadences', async () => {
    try {
      const data = await getCadences()
      setCadences(data)
    } catch (error) {
      console.error('Failed to load cadences:', error)
    }
  })

  useRealtime('knowledge_base', async (e) => {
    if (user?.id && (e.record.user_id === user.id || e.record.id === kbEntry?.id)) {
      const entry = await getFirstKnowledgeBaseEntry(user.id)
      if (entry) setKbEntry(entry)
    }
  })

  useRealtime('users', (e) => {
    if (e.action === 'update' && e.record.id === user?.id) {
      if (
        e.record.meta_token_status !== user?.meta_token_status ||
        e.record.uazapi_status !== user?.uazapi_status ||
        e.record.uazapi_error !== user?.uazapi_error
      ) {
        pb.collection('users')
          .authRefresh()
          .catch(() => {})
      }
    }
  })

  useEffect(() => {
    const checkGTM = () => {
      const gtmId = 'GTM-MWML5KFQ'
      const hasGtmScript = document.querySelector(`script[src*="${gtmId}"]`) !== null
      const isGtmObjectPresent =
        (window as any).google_tag_manager && (window as any).google_tag_manager[gtmId]

      if (hasGtmScript || isGtmObjectPresent) {
        setGtmStatus('active')
      } else {
        setGtmStatus('error')
      }
    }

    checkGTM()
    const timer = setTimeout(checkGTM, 2500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (user && !isInitialized && kbEntry !== undefined) {
      setMetaPixelId(user.meta_pixel_id || '')
      setMetaTestEventCode(user.meta_test_event_code || '')
      setMetaCapiToken(user.meta_capi_token || '')
      setMetaCampaignPhone(user.meta_campaign_phone || '')
      setMetaTagsList(user.meta_tags_list || [])

      setPrompt(user.ai_instructions || '')
      setAiName(user.ai_name || 'Bia')

      let voice = 'bia_consultora'
      let style = 'foco_luxo'
      if (user.ai_voice_id) {
        try {
          if (user.ai_voice_id.startsWith('{')) {
            const parsed = JSON.parse(user.ai_voice_id)
            voice = parsed.voice || voice
            style = parsed.avatarStyle || style
          } else {
            voice = user.ai_voice_id
          }
        } catch (e) {
          voice = user.ai_voice_id
        }
      }
      setAiVoiceId(voice)
      setAiAvatarStyle(style)

      if (user.ai_avatar) {
        setAvatarPreview(pb.files.getURL(user, user.ai_avatar))
      } else {
        setAvatarPreview(null)
      }

      setUazapiDomain(user.uazapi_domain || '')
      setUazapiToken(user.uazapi_token || '')

      setInitialState({
        pixel: user.meta_pixel_id || '',
        test: user.meta_test_event_code || '',
        capiToken: user.meta_capi_token || '',
        tags: JSON.stringify(user.meta_tags_list || []),
        prompt: user.ai_instructions || '',
        aiName: user.ai_name || 'Bia',
        aiVoiceId: voice,
        aiAvatarStyle: style,
        campaignPhone: user.meta_campaign_phone || '',
        site: kbEntry?.site || '',
        kbTags: kbEntry?.tags || '',
        uazapiDomain: user.uazapi_domain || '',
        uazapiToken: user.uazapi_token || '',
      })
      setIsInitialized(true)
    }
  }, [user, isInitialized, kbEntry])

  const isDirty =
    metaPixelId !== initialState.pixel ||
    metaTestEventCode !== initialState.test ||
    metaCapiToken !== initialState.capiToken ||
    metaCampaignPhone !== initialState.campaignPhone ||
    JSON.stringify(metaTagsList) !== initialState.tags ||
    prompt !== initialState.prompt ||
    aiName !== initialState.aiName ||
    aiVoiceId !== initialState.aiVoiceId ||
    aiAvatarStyle !== initialState.aiAvatarStyle ||
    site !== initialState.site ||
    tags !== initialState.kbTags ||
    uazapiDomain !== initialState.uazapiDomain ||
    uazapiToken !== initialState.uazapiToken ||
    aiAvatarFile !== null

  const shouldBlock = useCallback(
    ({ currentLocation, nextLocation }: any) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname,
    [isDirty],
  )
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (blocker.state === 'blocked') {
      const confirmLeave = window.confirm('Você tem alterações não salvas. Deseja sair sem salvar?')
      if (confirmLeave) {
        blocker.proceed()
      } else {
        blocker.reset()
      }
    }
  }, [blocker])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  useEffect(() => {
    const handleNext = (e: Event) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('roulette-next', handleNext)
    return () => window.removeEventListener('roulette-next', handleNext)
  }, [isDirty])

  const getCleanMeta = () => {
    const cleanPixelId = metaPixelId.replace(/[\s\uFEFF\xA0\u200B-\u200D\u2028\u2029]+/g, '')
    const cleanTestCode = metaTestEventCode.trim()
    const cleanCapiToken = metaCapiToken.trim()
    const cleanCampaignPhone = metaCampaignPhone.trim()
    return { cleanPixelId, cleanTestCode, cleanCapiToken, cleanCampaignPhone }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      if (!user?.id) throw new Error('Usuário não autenticado')
      const { cleanPixelId, cleanTestCode, cleanCapiToken, cleanCampaignPhone } = getCleanMeta()

      if (prompt.length > 300000) {
        toast({
          title: 'Erro de validação',
          description: 'O limite máximo é de 300.000 caracteres.',
          variant: 'destructive',
        })
        setIsSaving(false)
        return
      }

      const formData = new FormData()
      formData.append('uazapi_domain', uazapiDomain.trim())
      formData.append('uazapi_token', uazapiToken.trim())
      formData.append('meta_pixel_id', cleanPixelId)
      formData.append('meta_test_event_code', cleanTestCode)
      formData.append('meta_capi_token', cleanCapiToken)
      formData.append('meta_campaign_phone', cleanCampaignPhone)
      formData.append('meta_tags_list', JSON.stringify(metaTagsList))

      formData.append('ai_instructions', prompt)
      formData.append('ai_name', aiName)
      const voiceJson = JSON.stringify({ voice: aiVoiceId, avatarStyle: aiAvatarStyle })
      formData.append('ai_voice_id', voiceJson)

      if (aiAvatarFile) {
        formData.append('ai_avatar', aiAvatarFile)
      }

      let requiresTest = false
      if (cleanPixelId !== initialState.pixel || cleanCapiToken !== initialState.capiToken) {
        formData.append('meta_token_status', 'untested')
        formData.append('meta_last_validated', '')
        requiresTest = true
      }

      const updatedUser = await pb.collection('users').update(user.id, formData)

      let newKb
      if (kbEntry?.id) {
        newKb = await updateKnowledgeBaseEntry(kbEntry.id, { site, tags })
      } else {
        newKb = await createKnowledgeBaseEntry({ user_id: user.id, site, tags })
      }
      setKbEntry(newKb)

      await pb.collection('users').authRefresh()

      setInitialState({
        pixel: updatedUser.meta_pixel_id || '',
        test: updatedUser.meta_test_event_code || '',
        capiToken: updatedUser.meta_capi_token || '',
        tags: JSON.stringify(updatedUser.meta_tags_list || []),
        prompt: updatedUser.ai_instructions || '',
        aiName: updatedUser.ai_name || 'Bia',
        aiVoiceId: aiVoiceId,
        aiAvatarStyle: aiAvatarStyle,
        campaignPhone: updatedUser.meta_campaign_phone || '',
        site: newKb.site || '',
        kbTags: newKb.tags || '',
        uazapiDomain: updatedUser.uazapi_domain || '',
        uazapiToken: updatedUser.uazapi_token || '',
      })
      setAiAvatarFile(null)

      if (requiresTest && cleanPixelId && cleanCapiToken) {
        toast({
          title: 'Configurações salvas!',
          description: 'Validando conexão com o Meta Ads...',
        })
        try {
          await pb.send('/backend/v1/meta-test-connection', {
            method: 'POST',
            body: JSON.stringify({}),
            headers: { 'Content-Type': 'application/json' },
          })
          await pb.collection('users').authRefresh()
          toast({
            title: 'Sincronização bem-sucedida',
            description: 'O Pixel ID e Token CAPI foram validados e a IA está online.',
          })
        } catch (testError: any) {
          await pb.collection('users').authRefresh()
          const errorMsg = getErrorMessage(testError)
          setLastErrorMsg(errorMsg)
          toast({
            title: 'Erro de Sincronização com o Meta',
            description: `Falha na API: ${errorMsg}`,
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: 'Configurações salvas com sucesso!',
          description: 'A identidade da IA e parâmetros foram atualizados.',
        })
      }
    } catch (error: any) {
      const msg = getErrorMessage(error)
      toast({
        title: 'Erro ao salvar',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const testUazapiConnection = async (silent = false) => {
    if (!silent && isDirty) {
      toast({
        title: 'Alterações Não Salvas',
        description: 'Por favor, salve as configurações antes de testar a conexão.',
        variant: 'destructive',
      })
      return
    }

    if (!silent) setIsTestingUazapi(true)
    try {
      const phoneToTest = metaCampaignPhone || '5548992098050'
      await pb.send('/backend/v1/uazapi-test-connection', {
        method: 'POST',
        body: JSON.stringify({ phone: phoneToTest }),
        headers: { 'Content-Type': 'application/json' },
      })
      await pb.collection('users').authRefresh()
      if (!silent) {
        toast({
          title: 'Uazapi Conectado',
          description: 'A conexão foi validada com sucesso.',
        })
      }
    } catch (error: any) {
      const errorMsg = error.response?.message || getErrorMessage(error)
      await pb.collection('users').authRefresh()
      if (!silent) {
        toast({
          title: 'Erro de Conexão Uazapi',
          description: errorMsg,
          variant: 'destructive',
        })
      }
    } finally {
      if (!silent) setIsTestingUazapi(false)
    }
  }

  useEffect(() => {
    console.log('currentRoute', { component: 'ConfiguracoesCore', path: '/configuracoes' })
  }, [])

  const hasAutoTestedUazapi = useRef(false)
  useEffect(() => {
    if (
      isInitialized &&
      !hasAutoTestedUazapi.current &&
      user?.uazapi_domain &&
      user?.uazapi_token
    ) {
      hasAutoTestedUazapi.current = true
      setTimeout(() => {
        testUazapiConnection(true)
      }, 500)
    }
  }, [isInitialized, user?.uazapi_domain, user?.uazapi_token])

  const testMetaConnection = async () => {
    if (isDirty) {
      toast({
        title: 'Alterações Não Salvas',
        description: 'Por favor, salve as configurações antes de testar a conexão.',
        variant: 'destructive',
      })
      return
    }

    setIsTestingConnection(true)
    try {
      await pb.send('/backend/v1/meta-test-connection', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      })
      await pb.collection('users').authRefresh()
      toast({
        title: 'Conexão bem-sucedida',
        description:
          'O Pixel ID e Token CAPI foram validados com sucesso e estão comunicando com o Meta.',
      })
    } catch (error: any) {
      const errorMsg = getErrorMessage(error)
      setLastErrorMsg(errorMsg)
      await pb.collection('users').authRefresh()
      toast({
        title: 'Erro de Sincronização',
        description: `Falha na API: ${errorMsg}`,
        variant: 'destructive',
      })
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !user) return

    setUploading(true)
    try {
      const formData = new FormData()
      let xmlContextToAdd = ''
      for (const file of Array.from(files)) {
        if (file.name.toLowerCase().endsWith('.xml')) {
          try {
            const text = await file.text()
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(text, 'text/xml')
            const elements = Array.from(xmlDoc.getElementsByTagName('*'))
            const extractedText = elements
              .map((el) => {
                return Array.from(el.childNodes)
                  .filter((node) => node.nodeType === Node.TEXT_NODE)
                  .map((node) => node.textContent?.trim())
                  .filter(Boolean)
                  .join(' ')
              })
              .filter(Boolean)
              .join('\n')
            const finalContext = extractedText || text
            xmlContextToAdd += `\n\n--- Conteúdo Estruturado (${file.name}) ---\n${finalContext}\n---------------------------\n`
          } catch (e) {
            console.error('Failed to parse XML file:', e)
          }
        }
      }

      if (kbEntry?.id) {
        Array.from(files).forEach((file) => formData.append('attachments+', file))
        if (xmlContextToAdd) {
          const currentContent = kbEntry.content || ''
          formData.append('content', currentContent + xmlContextToAdd)
        }
        const updatedEntry = await pb
          .collection('knowledge_base')
          .update<KnowledgeBaseEntry>(kbEntry.id, formData)
        setKbEntry(updatedEntry)
      } else {
        formData.append('user_id', user.id)
        formData.append('site', site)
        formData.append('tags', tags)
        if (xmlContextToAdd) {
          formData.append('content', xmlContextToAdd)
        }
        Array.from(files).forEach((file) => formData.append('attachments', file))
        const newEntry = await pb.collection('knowledge_base').create<KnowledgeBaseEntry>(formData)
        setKbEntry(newEntry)
      }

      toast({ title: 'Arquivo enviado com sucesso e integrado à base de conhecimento' })
    } catch (err) {
      toast({ title: 'Erro ao enviar arquivo', variant: 'destructive' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDeleteFile = async (filenameToDelete: string) => {
    if (!kbEntry?.id || !user) return
    try {
      const formData = new FormData()
      formData.append('attachments-', filenameToDelete)
      const updatedEntry = await pb
        .collection('knowledge_base')
        .update<KnowledgeBaseEntry>(kbEntry.id, formData)
      setKbEntry(updatedEntry)
      toast({ title: 'Arquivo removido com sucesso' })
    } catch (err) {
      toast({ title: 'Erro ao remover arquivo', variant: 'destructive' })
    }
  }

  const handleSaveCadenceInstructions = async () => {
    if (!editingCadence) return

    if (editAiInstructions.length > 300000) {
      toast({
        title: 'Erro de validação',
        description: 'O limite máximo é de 300.000 caracteres.',
        variant: 'destructive',
      })
      return
    }

    setIsSavingCadence(true)
    try {
      await updateCadence(editingCadence.id, {
        ai_instructions: editAiInstructions,
      })
      toast({ title: 'Regras de IA atualizadas na cadência' })
      setEditingCadence(null)
    } catch (error) {
      const msg = getErrorMessage(error)
      toast({ title: 'Erro ao salvar', description: msg, variant: 'destructive' })
    } finally {
      setIsSavingCadence(false)
    }
  }

  const activeCadences = cadences.filter((c) => c.is_active)
  const activeCadencesCount = activeCadences.length
  const getCadenceIssues = (cadence: Cadence) => {
    const issues = []
    if (!cadence.title?.trim()) issues.push('Sem título')
    if (!cadence.content?.trim()) issues.push('Sem conteúdo')
    return issues
  }
  const intactCadencesCount = activeCadences.filter((c) => getCadenceIssues(c).length === 0).length

  // Meta Status Logic
  const metaTokenStatus = user?.meta_token_status || 'untested'
  const isPixelConfigured = metaPixelId.trim().length > 0

  let connectionBadgeText = 'Não Testado'
  let connectionBadgeColor = 'bg-muted text-muted-foreground'

  if (!user?.meta_pixel_id || !user?.meta_capi_token) {
    connectionBadgeText = 'Configuração Pendente'
    connectionBadgeColor =
      'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 border'
  } else if (
    metaTokenStatus === 'active' ||
    metaTokenStatus === 'valid' ||
    metaTokenStatus === 'Connected'
  ) {
    connectionBadgeText = 'Conectado'
    connectionBadgeColor =
      'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border'
  } else if (
    metaTokenStatus === 'Erro de Validação' ||
    metaTokenStatus === 'invalid' ||
    metaTokenStatus === 'expired' ||
    metaTokenStatus === 'untested'
  ) {
    connectionBadgeText = metaTokenStatus === 'untested' ? 'Não Testado' : 'Erro de Sincronização'
    connectionBadgeColor =
      metaTokenStatus === 'untested'
        ? 'bg-muted text-muted-foreground'
        : 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20 border'
  }

  const gtmStatusText =
    gtmStatus === 'checking'
      ? 'Verificando...'
      : gtmStatus === 'active'
        ? 'Tag GTM Detectada e Ativa'
        : 'Tag GTM Não Detectada (Possível AdBlock)'
  const gtmStatusColor =
    gtmStatus === 'checking'
      ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      : gtmStatus === 'active'
        ? 'bg-green-500/10 text-green-600 border-green-500/20'
        : 'bg-amber-500/10 text-amber-600 border-amber-500/20'

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-secondary">Configurações da IA</h2>
        <p className="text-muted-foreground mt-2 text-lg">
          Gerenciamento unificado da identidade, conhecimento e integrações do agente inteligente.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-xl font-semibold tracking-tight text-secondary">
            Performance Recente
          </h3>
        </div>
        <RecentPerformance />
      </div>

      <div className="grid gap-8">
        <LeadOriginsDashboard />

        {/* AI Identity Section */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-purple-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <User className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-xl">Identidade da IA</CardTitle>
                  <CardDescription>
                    Personalize o nome, a foto e a voz da sua assistente virtual.
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    aiName.trim().length > 0 && prompt.trim().length > 0 ? 'default' : 'secondary'
                  }
                  className={cn(
                    'whitespace-nowrap w-fit',
                    aiName.trim().length > 0 && prompt.trim().length > 0
                      ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border'
                      : '',
                  )}
                >
                  <Activity className="w-3 h-3 mr-1.5" />
                  {aiName.trim().length > 0 && prompt.trim().length > 0 ? 'IA Ativa' : 'IA Inativa'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-8 mb-8">
              <div className="flex flex-col items-center space-y-4 lg:w-1/4">
                <Avatar className="h-32 w-32 border-4 border-background shadow-md">
                  <AvatarImage
                    src={
                      avatarPreview ||
                      `https://img.usecurling.com/p/256/256?q=${AVATAR_STYLES.find((s) => s.id === aiAvatarStyle)?.query}&dpr=2`
                    }
                    className="object-cover bg-muted"
                  />
                  <AvatarFallback className="text-3xl bg-primary/10 text-primary font-medium">
                    {aiName?.charAt(0)?.toUpperCase() || 'B'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center w-full">
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    className="hidden"
                    ref={avatarInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setAiAvatarFile(file)
                        setAvatarPreview(URL.createObjectURL(file))
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => avatarInputRef.current?.click()}
                    className="w-full max-w-[200px]"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Personalizado
                  </Button>
                </div>
              </div>

              <div className="flex-1 space-y-8">
                <div className="space-y-2">
                  <Label htmlFor="ai_name" className="text-base font-semibold text-secondary">
                    Nome da IA <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="ai_name"
                    placeholder="Ex: Bia"
                    value={aiName}
                    onChange={(e) => setAiName(e.target.value)}
                    className="max-w-md text-lg font-medium bg-muted/30"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold text-secondary">
                    Estilo Visual da IA (Avatar)
                  </Label>
                  <RadioGroup
                    value={aiAvatarStyle}
                    onValueChange={setAiAvatarStyle}
                    className="grid grid-cols-1 xl:grid-cols-3 gap-4"
                  >
                    {AVATAR_STYLES.map((style) => (
                      <div key={style.id}>
                        <RadioGroupItem
                          value={style.id}
                          id={`avatar-${style.id}`}
                          className="peer sr-only"
                        />
                        <Label
                          htmlFor={`avatar-${style.id}`}
                          className="flex flex-col rounded-xl border-2 border-muted bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-muted rounded-md text-foreground peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-colors">
                              <style.icon className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-sm">{style.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground leading-relaxed flex-1">
                            {style.description}
                          </span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            </div>

            <div className="border-t pt-8 space-y-6">
              <div className="space-y-4">
                <Label className="text-base font-semibold text-secondary">Perfil de Voz</Label>
                <RadioGroup
                  value={aiVoiceId}
                  onValueChange={setAiVoiceId}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                  {VOICE_PROFILES.map((profile) => (
                    <div key={profile.id}>
                      <RadioGroupItem
                        value={profile.id}
                        id={`voice-${profile.id}`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`voice-${profile.id}`}
                        className="flex flex-col items-center text-center rounded-xl border-2 border-muted bg-card p-5 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer h-full transition-all relative overflow-hidden group"
                      >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground">
                                <Info className="h-4 w-4" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="text-sm p-3 space-y-1" side="top">
                              <p>
                                <strong>Estabilidade:</strong> {profile.stability}%
                              </p>
                              <p>
                                <strong>Clareza:</strong> {profile.clarity}%
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary transition-colors peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground">
                          <Volume2 className="h-6 w-6" />
                        </div>
                        <span className="font-semibold mb-1 text-base">{profile.name}</span>
                        <span className="text-xs text-muted-foreground mb-4">{profile.tone}</span>
                        <div className="w-full mt-auto pt-4 border-t flex justify-around text-xs text-muted-foreground">
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-medium text-foreground text-sm">
                              {profile.stability}%
                            </span>
                            <span className="text-[10px] uppercase tracking-wider">
                              Estabilidade
                            </span>
                          </div>
                          <div className="w-px h-8 bg-border"></div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-medium text-foreground text-sm">
                              {profile.clarity}%
                            </span>
                            <span className="text-[10px] uppercase tracking-wider">Clareza</span>
                          </div>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Knowledge Base Section */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-indigo-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <BookOpen className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Base de Conhecimento e Comportamento</CardTitle>
                <CardDescription>
                  Forneça o contexto, regras (Prompt) e documentos para guiar o atendimento.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label htmlFor="system-prompt" className="text-base font-semibold text-secondary">
                  Prompt do Sistema (Regras Principais) <span className="text-destructive">*</span>
                </Label>
                <span className="text-xs text-muted-foreground font-mono">
                  {prompt.length.toLocaleString('pt-BR')} / 300.000
                </span>
              </div>
              <Textarea
                id="system-prompt"
                placeholder="Ex: Você é um atendente..."
                className="min-h-[250px] resize-y bg-card border-muted-foreground/20 font-mono text-sm shadow-inner focus-visible:ring-indigo-500"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={300000}
                spellCheck={false}
              />
              <div className="bg-indigo-500/5 rounded-lg p-3 flex items-start gap-2 border border-indigo-500/10">
                <CheckCircle2 className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-indigo-600 font-semibold">Dica:</strong> Especifique o tom
                  de voz, o idioma padrão, restrições de assunto e como a IA deve lidar com
                  situações que não sabe responder. O CRM e as cadências herdam essas regras.
                </p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label
                  htmlFor="site"
                  className="flex items-center gap-2 text-sm font-semibold text-secondary"
                >
                  <Globe className="h-4 w-4" />
                  Site de Referência
                </Label>
                <Input
                  id="site"
                  placeholder="Ex: https://meusite.com.br"
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="bg-muted/30"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="tags"
                  className="flex items-center gap-2 text-sm font-semibold text-secondary"
                >
                  <Tags className="h-4 w-4" />
                  Tags de Contexto
                </Label>
                <Input
                  id="tags"
                  placeholder="Ex: Imóveis, Lançamento"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="bg-muted/30"
                />
              </div>
            </div>

            <div className="space-y-4 pt-6 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <Label className="flex items-center gap-2 text-base font-semibold text-secondary">
                    <Paperclip className="h-4 w-4" />
                    Arquivos Anexos (Documentação)
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Faça upload de documentos (PDF, TXT, DOCX, XML) para a IA usar como contexto
                    adicional.
                  </p>
                </div>
                <div>
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".pdf,.txt,.doc,.docx,.xml,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/xml,text/xml"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {uploading ? 'Enviando...' : 'Subir Arquivos'}
                  </Button>
                </div>
              </div>

              {kbEntry?.attachments && kbEntry.attachments.length > 0 && (
                <ul className="space-y-2 mt-4">
                  {kbEntry.attachments.map((filename, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between p-3 bg-muted/20 rounded-md border text-sm"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <a
                          href={pb.files.getURL(kbEntry, filename)}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:underline text-foreground truncate font-medium"
                        >
                          {filename}
                        </a>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteFile(filename)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cadence Audit */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-teal-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-teal-500/10 rounded-xl">
                <FileText className="h-6 w-6 text-teal-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Auditoria de Cadências</CardTitle>
                <CardDescription>
                  {activeCadencesCount === intactCadencesCount && activeCadencesCount > 0
                    ? `${intactCadencesCount} cadências íntegras.`
                    : `${activeCadencesCount} cadências ativas. ${intactCadencesCount} íntegras.`}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Integridade</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cadences.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        Nenhuma cadência encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    cadences.map((cadence) => {
                      const issues = getCadenceIssues(cadence)
                      const isIntact = issues.length === 0 && cadence.is_active
                      const isInactive = !cadence.is_active

                      return (
                        <TableRow key={cadence.id} className={cn(isInactive && 'opacity-60')}>
                          <TableCell className="font-medium">
                            {cadence.title || 'Sem Título'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={cadence.is_active ? 'default' : 'secondary'}>
                              {cadence.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {isInactive ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : isIntact ? (
                              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 border font-medium">
                                Íntegra
                              </Badge>
                            ) : (
                              <div className="flex flex-col gap-1 items-start">
                                <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-500/20 border font-medium">
                                  Atenção: Erro(s)
                                </Badge>
                                <span className="text-[10px] text-red-500 font-medium max-w-[150px] leading-tight">
                                  {issues.join(', ')}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCadence(cadence)
                                setEditAiInstructions(cadence.ai_instructions || '')
                              }}
                            >
                              Editar Regras Específicas
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              <strong>Nota:</strong> As cadências herdam o "Prompt do Sistema" por padrão. Regras
              editadas aqui atuarão como exceções específicas para a etapa.
            </p>
          </CardContent>
        </Card>

        {/* Meta Event Manager */}
        <Card
          className={cn(
            'border-border shadow-elevation transition-colors duration-300',
            metaTokenStatus === 'Permissões Insuficientes' &&
              'border-red-500/50 ring-1 ring-red-500/20',
          )}
        >
          <div
            className={cn(
              'h-1 w-full transition-colors duration-300',
              metaTokenStatus === 'Permissões Insuficientes' ? 'bg-red-500' : 'bg-blue-600',
            )}
          ></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 rounded-xl">
                <Facebook className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração Meta Ads & Ingestão</CardTitle>
                <CardDescription>
                  Configure o Pixel, CAPI e os dados de contato do WhatsApp.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="meta-pixel-id" className="font-semibold text-secondary">
                    Meta Pixel ID
                  </Label>
                  <Badge
                    variant={isPixelConfigured ? 'default' : 'secondary'}
                    className="h-5 text-[10px] px-2 font-medium"
                  >
                    {isPixelConfigured ? 'Configurado' : 'Não configurado'}
                  </Badge>
                </div>
                <Input
                  id="meta-pixel-id"
                  placeholder="Ex: 1522162279584545 (Padrão)"
                  value={metaPixelId}
                  onChange={(e) => setMetaPixelId(e.target.value.replace(/\D/g, ''))}
                  className={cn(
                    'bg-muted/30 focus-visible:ring-blue-600',
                    metaPixelId.length > 0 &&
                      !/^\d+$/.test(metaPixelId) &&
                      'border-red-500 focus-visible:ring-red-500',
                  )}
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-3">
                <Label
                  htmlFor="meta-test-code"
                  className="font-semibold text-secondary flex items-center h-[26px]"
                >
                  Código de Teste de Evento (opcional)
                </Label>
                <Input
                  id="meta-test-code"
                  placeholder="Ex: TEST12345"
                  value={metaTestEventCode}
                  onChange={(e) => setMetaTestEventCode(e.target.value.replace(/\s+/g, ''))}
                  className="bg-muted/30 focus-visible:ring-blue-600"
                />
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="meta-capi-token" className="font-semibold text-secondary">
                  Token da API de Conversões (CAPI)
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="meta-capi-token"
                    type="password"
                    placeholder="EAAB..."
                    value={metaCapiToken}
                    onChange={(e) => setMetaCapiToken(e.target.value.trim())}
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-blue-600"
                  />
                </div>
              </div>

              <div className="flex justify-end mt-2 md:col-span-2 items-center">
                <div className="mr-auto mt-1 flex flex-col items-start gap-1">
                  <Badge
                    variant="outline"
                    className={cn('h-5 text-[10px] px-2 font-medium', connectionBadgeColor)}
                    title={lastErrorMsg || ''}
                  >
                    {connectionBadgeText}
                  </Badge>
                  {(metaTokenStatus === 'invalid' || metaTokenStatus === 'Erro de Validação') &&
                    lastErrorMsg && (
                      <span
                        className="text-[10px] text-destructive max-w-xs truncate"
                        title={lastErrorMsg}
                      >
                        {lastErrorMsg}
                      </span>
                    )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testMetaConnection}
                  disabled={isTestingConnection || !user?.meta_pixel_id || !user?.meta_capi_token}
                  className="gap-2"
                >
                  {isTestingConnection ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 text-green-600" />
                  )}
                  Testar Conexão do Pixel
                </Button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <Label className="font-semibold text-secondary">
                Tags Multi-Pixel ({metaTagsList.length})
              </Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Nome (Ex: BRF 4)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="bg-muted/30"
                />
                <Input
                  placeholder="ID (Ex: 123456789)"
                  value={newTagId}
                  onChange={(e) => setNewTagId(e.target.value)}
                  className="bg-muted/30"
                  inputMode="numeric"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (newTagName && newTagId && /^\d+$/.test(newTagId.trim())) {
                      setMetaTagsList([...metaTagsList, { name: newTagName, id: newTagId.trim() }])
                      setNewTagName('')
                      setNewTagId('')
                    }
                  }}
                  type="button"
                >
                  Adicionar
                </Button>
              </div>
              {metaTagsList.length > 0 && (
                <div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2">
                  {metaTagsList.map((tag, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 text-sm border rounded-md bg-muted/20"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <span className="font-medium truncate">{tag.name}</span>
                        <span className="text-muted-foreground font-mono bg-muted/50 px-2 py-0.5 rounded text-xs">
                          {tag.id}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-500/10 h-8 px-2"
                        onClick={() => setMetaTagsList(metaTagsList.filter((_, i) => i !== index))}
                        type="button"
                      >
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-secondary">Telefone de Campanha Ativa</h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'h-6 gap-1.5',
                    metaCampaignPhone
                      ? 'bg-green-500/10 text-green-600 border-green-500/20'
                      : 'bg-amber-500/10 text-amber-600 border-amber-500/20',
                  )}
                >
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      metaCampaignPhone ? 'bg-green-500 animate-pulse' : 'bg-amber-500',
                    )}
                  />
                  {metaCampaignPhone ? 'Online' : 'Não Configurado'}
                </Badge>
              </div>
              <div className="space-y-3">
                <Label htmlFor="meta-campaign-phone" className="font-semibold text-secondary">
                  Telefone da Campanha (WhatsApp)
                </Label>
                <Input
                  id="meta-campaign-phone"
                  placeholder="Ex: 5511999999999"
                  value={metaCampaignPhone}
                  onChange={(e) => setMetaCampaignPhone(e.target.value.replace(/\D/g, ''))}
                  className="bg-muted/30 focus-visible:ring-blue-600"
                  inputMode="numeric"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GTM */}
        <Card className="border-border shadow-elevation overflow-hidden">
          <div className="h-1 bg-green-500 w-full"></div>
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-500/10 rounded-xl">
                <Activity className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Google Tag Manager</CardTitle>
                <CardDescription>Status de integração do container global GTM.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-xl bg-muted/20 gap-4">
              <div className="space-y-1">
                <h4 className="font-semibold text-secondary flex items-center gap-2">
                  Container ID:{' '}
                  <span className="font-mono bg-background px-2 py-0.5 rounded border text-sm">
                    GTM-MWML5KFQ
                  </span>
                </h4>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  'h-7 px-3 text-xs font-semibold whitespace-nowrap shrink-0',
                  gtmStatusColor,
                )}
              >
                {gtmStatusText}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <DiagnosticCenter />

        {/* Integrations */}
        <Card className="border-border shadow-elevation">
          <CardHeader className="bg-muted/10 pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 rounded-xl">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-xl">Integração e Chaves de API</CardTitle>
                <CardDescription>
                  Configure as chaves de acesso do Uazapi e do provedor de inteligência.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-secondary">Conexão Uazapi</h3>
                  <Badge
                    variant="outline"
                    className={cn(
                      'h-5 text-[10px] px-2 font-medium',
                      user?.uazapi_status === 'connected' || user?.uazapi_status === 'Connected'
                        ? 'bg-green-500/10 text-green-600 border-green-500/20'
                        : user?.uazapi_status === 'error' || user?.uazapi_status === 'Error'
                          ? 'bg-red-500/10 text-red-600 border-red-500/20'
                          : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {user?.uazapi_status === 'connected' || user?.uazapi_status === 'Connected'
                      ? 'Conectado'
                      : user?.uazapi_status === 'error' || user?.uazapi_status === 'Error'
                        ? 'Erro de Conexão'
                        : 'Não Testado'}
                  </Badge>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="uazapi-domain" className="text-sm font-medium">
                    Domínio / URL da API
                  </Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="uazapi-domain"
                      type="url"
                      placeholder="https://iabrfimveis.uazapi.com"
                      value={uazapiDomain}
                      onChange={(e) => setUazapiDomain(e.target.value)}
                      className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="uazapi-token" className="text-sm font-medium">
                    Global API Key
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="uazapi-token"
                      type="password"
                      placeholder="SuAwfdyhG5J3DTooe0zj8DBkXD6LziAyM1vNoYcW3dsAqyAiYj"
                      value={uazapiToken}
                      onChange={(e) => setUazapiToken(e.target.value)}
                      className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                    />
                  </div>
                </div>

                {(user?.uazapi_status === 'error' || user?.uazapi_status === 'Error') &&
                  user?.uazapi_error && (
                    <div className="p-3 border border-red-500/20 bg-red-500/10 rounded-md">
                      <p className="text-xs text-red-600 font-medium leading-tight">
                        {user.uazapi_error}
                      </p>
                    </div>
                  )}

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant={
                      user?.uazapi_status === 'error' || user?.uazapi_status === 'Error'
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => testUazapiConnection(false)}
                    disabled={isTestingUazapi}
                    className={
                      user?.uazapi_status === 'error' || user?.uazapi_status === 'Error'
                        ? 'bg-red-600 hover:bg-red-700 text-white gap-2'
                        : 'gap-2'
                    }
                  >
                    {isTestingUazapi ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck
                        className={cn(
                          'h-4 w-4',
                          user?.uazapi_status === 'error' || user?.uazapi_status === 'Error'
                            ? 'text-white'
                            : 'text-amber-600',
                        )}
                      />
                    )}
                    {user?.uazapi_status === 'error' || user?.uazapi_status === 'Error'
                      ? 'Reconectar API'
                      : 'Validar Integridade'}
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                <Label htmlFor="openai-key" className="font-semibold text-secondary">
                  OpenAI API Key
                </Label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="openai-key"
                    type="password"
                    placeholder="sk-••••••••••••••••"
                    defaultValue="sk-simulation_456"
                    className="pl-10 h-11 bg-muted/30 focus-visible:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={!!editingCadence}
        onOpenChange={(open) => {
          if (!open) setEditingCadence(null)
        }}
      >
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Regras IA: {editingCadence?.title}</DialogTitle>
            <DialogDescription>
              Defina instruções exclusivas. Caso vazio, esta cadência herdará o{' '}
              <strong>Prompt do Sistema</strong> definido na Base de Conhecimento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Descreva como a IA deve se comportar nesta cadência..."
              value={editAiInstructions}
              onChange={(e) => setEditAiInstructions(e.target.value)}
              className="min-h-[200px] resize-y"
              maxLength={300000}
              spellCheck={false}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingCadence(null)}
              disabled={isSavingCadence}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveCadenceInstructions} disabled={isSavingCadence}>
              {isSavingCadence ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
                </>
              ) : (
                'Salvar Regras'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-xl border-t border-border flex justify-end md:pl-[var(--sidebar-width)] z-30 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-5xl w-full mx-auto flex justify-end items-center gap-4 px-4 md:px-0">
          {isDirty && (
            <span className="text-sm text-amber-500 font-medium hidden sm:inline-block">
              Alterações não salvas
            </span>
          )}
          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            className="shadow-md px-8 h-11 hover:scale-105 transition-transform"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                Salvando...
              </span>
            ) : (
              <span className="flex items-center gap-2 font-medium">
                <Save className="h-5 w-5" />
                Salvar Todas as Configurações da IA
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
