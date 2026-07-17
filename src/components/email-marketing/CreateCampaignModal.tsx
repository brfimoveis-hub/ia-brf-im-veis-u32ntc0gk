import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RichTextEditor } from '@/components/customers/RichTextEditor'
import { useAuth } from '@/hooks/use-auth'
import { createCampaign, processCampaign } from '@/services/email_campaigns'
import { toast } from 'sonner'
import { Loader2, Send } from 'lucide-react'

const STATUS_OPTIONS = [
  'Novo',
  'D0 - Contato Imediato',
  'D1 - Follow up 1',
  'D2 - Follow up 2',
  'D3 - Follow up 3',
  'D4 - Follow up 4',
  'D5 - Follow up 5',
  'D6 - Follow up 6',
  'D7 - Follow up 7',
  'D8 - Follow up 8',
  'D9 - Despedida/Nutrição',
  'Fechamento',
  'Qualificação',
  'Engajamento',
  'Visita',
  'Proposta',
]

const PROFILE_OPTIONS = ['Investidor', 'Morador', 'Primeiro Imóvel', 'Veranista']

export function CreateCampaignModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [priceRange, setPriceRange] = useState('')
  const [leadProfile, setLeadProfile] = useState('')
  const [sending, setSending] = useState(false)

  const resetForm = () => {
    setName('')
    setSubject('')
    setContent('')
    setStatus('')
    setNeighborhood('')
    setPriceRange('')
    setLeadProfile('')
  }

  const handleSend = async () => {
    if (!name.trim() || !subject.trim() || !content.trim()) return
    setSending(true)
    try {
      const campaign = await createCampaign({
        user_id: user?.id,
        name: name.trim(),
        subject: subject.trim(),
        content: content.trim(),
        status: 'draft',
        total_recipients: 0,
        success_count: 0,
        failure_count: 0,
      })

      const filter: Record<string, string> = {}
      if (status) filter.status = status
      if (neighborhood) filter.neighborhood = neighborhood
      if (priceRange) filter.price_range = priceRange
      if (leadProfile) filter.lead_profile = leadProfile

      const result = await processCampaign(campaign.id, filter)
      toast.success(`Campanha enviada: ${result.sent} sucessos, ${result.failed} falhas`)
      resetForm()
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Erro ao processar campanha: ' + (err.message || ''))
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!sending) {
          onOpenChange(o)
          if (!o) resetForm()
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle>Nova Campanha de Email</DialogTitle>
          <DialogDescription>
            Crie e envie uma campanha para um segmento de clientes.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="camp-name">Nome da Campanha</Label>
            <Input
              id="camp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={sending}
              placeholder="Ex: Lançamento Villa dos Açores"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="camp-subject">Assunto</Label>
            <Input
              id="camp-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={sending}
              placeholder="Assunto do email"
              maxLength={200}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Conteúdo</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              disabled={sending}
              placeholder="Escreva o conteúdo do email..."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Placeholders: {'{{name}}, {{first_name}}, {{email}}, {{phone}}'}
          </p>
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-semibold">Filtros de Segmentação (opcional)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <Select value={status} onValueChange={setStatus} disabled={sending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Perfil do Lead</Label>
                <Select value={leadProfile} onValueChange={setLeadProfile} disabled={sending}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFILE_OPTIONS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Bairro</Label>
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  disabled={sending}
                  placeholder="Ex: Biguaçu"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Faixa de Preço</Label>
                <Input
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value)}
                  disabled={sending}
                  placeholder="Ex: 500k-1M"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => {
              if (!sending) {
                onOpenChange(false)
                resetForm()
              }
            }}
            disabled={sending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !name.trim() || !subject.trim() || !content.trim()}
            className="w-full sm:w-auto"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar Campanha
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
