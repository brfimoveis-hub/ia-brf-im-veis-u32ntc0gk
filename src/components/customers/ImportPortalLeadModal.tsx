import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { Building2, Loader2, Sparkles, UserPlus } from 'lucide-react'

interface ImportPortalLeadModalProps {
  onSuccess?: (customerId: string) => void
}

const ORIGIN_OPTIONS = [
  'Portal Chaves na Mão',
  'VivaReal',
  'Zap Imóveis',
  'Imovelweb',
  'Olx Imóveis',
  'Site BRF Imóveis',
  'Outro Portal Externo',
]

export function ImportPortalLeadModal({ onSuccess }: ImportPortalLeadModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [source, setSource] = useState('Portal Chaves na Mão')
  const [message, setMessage] = useState('')

  const resetForm = () => {
    setName('')
    setPhone('')
    setEmail('')
    setSource('Portal Chaves na Mão')
    setMessage('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const cleanName = name.trim()
    const cleanPhone = phone.replace(/\D/g, '')

    if (!cleanName) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do lead recebido do portal.',
        variant: 'destructive',
      })
      return
    }

    if (!cleanPhone || cleanPhone.length < 8) {
      toast({
        title: 'Telefone inválido',
        description: 'Informe o telefone/WhatsApp completo com DDD.',
        variant: 'destructive',
      })
      return
    }

    // Normalização brasileira: se vier sem DDI 55, prefixar quando tiver 10 ou 11 dígitos
    let finalPhone = cleanPhone
    if ((finalPhone.length === 10 || finalPhone.length === 11) && !finalPhone.startsWith('55')) {
      finalPhone = `55${finalPhone}`
    }

    setLoading(true)

    try {
      const assignedUserId = user?.id || 'g5jto8bhulw01bz'
      const cleanEmail = email.trim()
      const nowIso = new Date().toISOString()
      const cleanSource = source.trim() || 'Portal Chaves na Mão'

      let fullNotes = ''
      if (message.trim()) {
        fullNotes = `Mensagem do portal: ${message.trim()} (importado via formulário rápido)`
      } else {
        fullNotes = `Lead recebido de ${cleanSource} (importado manualmente)`
      }

      // 1. Criar ou reutilizar em leads
      let leadRecordId = ''
      try {
        const existingLeads = await pb.collection('leads').getList(1, 1, {
          filter: `phone = '${finalPhone}' || phone = '${cleanPhone}'`,
        })
        if (existingLeads.items.length > 0) {
          leadRecordId = existingLeads.items[0].id
        } else {
          const leadData = {
            assigned_to: assignedUserId,
            name: cleanName,
            phone: finalPhone,
            email: cleanEmail,
            source: cleanSource,
            status: 'Novo',
            notes: fullNotes,
          }
          const createdLead = await pb.collection('leads').create(leadData)
          leadRecordId = createdLead.id
        }
      } catch (leadErr) {
        console.warn('Aviso ao registrar em leads:', leadErr)
      }

      // 2. Criar ou atualizar em customers
      let customerId = ''
      const existingCustomers = await pb.collection('customers').getList(1, 1, {
        filter: `phone = '${finalPhone}' || phone_1_value = '${finalPhone}' || phone = '${cleanPhone}'`,
      })

      const originEntry = {
        date: nowIso,
        source: cleanSource,
        type: 'portal',
        lead_id: leadRecordId || null,
        message: message.trim() || null,
      }

      if (existingCustomers.items.length > 0) {
        const existing = existingCustomers.items[0]
        customerId = existing.id

        const prevHistory = Array.isArray(existing.origin_history) ? existing.origin_history : []
        const prevTags = Array.isArray(existing.tags) ? existing.tags : []

        const newTags = Array.from(
          new Set([...prevTags, 'lead_quente', 'portal_externo', 'manual_portal']),
        )

        const oldNotes = existing.notes || ''
        const updatedNotes = oldNotes ? `${oldNotes}\n\n${fullNotes}` : fullNotes

        await pb.collection('customers').update(existing.id, {
          source: cleanSource,
          last_origin: cleanSource,
          last_origin_at: nowIso,
          origin_history: [...prevHistory, originEntry],
          tags: newTags,
          notes: updatedNotes,
          persistence_status: 'ativo',
          ...(cleanEmail && !existing.email
            ? { email: cleanEmail, email_1_value: cleanEmail }
            : {}),
        })

        toast({
          title: 'Lead atualizado com sucesso!',
          description: `${cleanName} já constava no CRM e teve a origem atualizada para ${cleanSource}.`,
        })
      } else {
        const newCustomerData = {
          user_id: assignedUserId,
          name: cleanName,
          first_name: cleanName.split(' ')[0] || cleanName,
          phone: finalPhone,
          phone_1_value: finalPhone,
          email: cleanEmail,
          email_1_value: cleanEmail,
          status: '1. Acolhimento',
          phase: '',
          source: cleanSource,
          last_origin: cleanSource,
          last_origin_at: nowIso,
          notes: fullNotes,
          tags: ['lead_quente', 'portal_externo', 'manual_portal'],
          origin_history: [originEntry],
          persistence_status: 'ativo',
          follow_up_count: 0,
          rejection_count: 0,
          urgency: 3,
        }

        const created = await pb.collection('customers').create(newCustomerData)
        customerId = created.id

        toast({
          title: 'Lead importado com sucesso!',
          description: `${cleanName} foi cadastrado e posicionado em "1. Acolhimento" para atendimento da Bia.`,
        })
      }

      resetForm()
      setOpen(false)

      if (onSuccess && customerId) {
        onSuccess(customerId)
      }
    } catch (err: any) {
      console.error('Erro ao importar lead do portal:', err)
      toast({
        title: 'Erro ao importar lead',
        description: err?.message || 'Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-medium"
          title="Importar lead recebido em portal imobiliário externo (Chaves na Mão, VivaReal, Zap, etc.)"
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Importar lead do portal</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <UserPlus className="h-4 w-4 text-emerald-600" />
            Importar lead do portal
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Cadastre rapidamente o lead preso no formulário do portal em menos de 30 segundos. Ele
            entrará direto no CRM e na fila de acolhimento quente da Bia.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 py-2">
          {/* Origem */}
          <div className="space-y-1.5">
            <Label htmlFor="portal-source" className="text-xs font-semibold">
              Origem do Portal *
            </Label>
            <Select value={source} onValueChange={setSource}>
              <SelectTrigger id="portal-source" className="h-9 text-xs">
                <SelectValue placeholder="Selecione o portal" />
              </SelectTrigger>
              <SelectContent>
                {ORIGIN_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Nome */}
          <div className="space-y-1.5">
            <Label htmlFor="portal-name" className="text-xs font-semibold">
              Nome do Lead *
            </Label>
            <Input
              id="portal-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Amalia"
              className="h-9 text-xs"
              autoFocus
            />
          </div>

          {/* Telefone */}
          <div className="space-y-1.5">
            <Label htmlFor="portal-phone" className="text-xs font-semibold">
              Telefone / WhatsApp *
            </Label>
            <Input
              id="portal-phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: (67) 99857-6043 ou 5567998576043"
              className="h-9 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground">
              Com DDD. Se não incluir o 55, ele será adicionado automaticamente.
            </p>
          </div>

          {/* E-mail (opcional) */}
          <div className="space-y-1.5">
            <Label htmlFor="portal-email" className="text-xs font-semibold">
              E-mail <span className="text-muted-foreground font-normal">(opcional)</span>
            </Label>
            <Input
              id="portal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: acmanfio@gmail.com"
              className="h-9 text-xs"
            />
          </div>

          {/* Mensagem enviada pelo cliente no portal */}
          <div className="space-y-1.5">
            <Label htmlFor="portal-msg" className="text-xs font-semibold">
              Mensagem ou Perguntas do Cliente
            </Label>
            <Textarea
              id="portal-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Eu posso visitar? Qual andar? Tenho interesse, está disponível? Me retorne no whatsapp! Qual o valor do condomínio?"
              rows={3}
              className="text-xs resize-none"
            />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />A Bia usará essa mensagem para
              responder direto às dúvidas sem questionários repetitivos.
            </p>
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <UserPlus className="h-3.5 w-3.5" />
                  Criar Lead no CRM
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
