import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { sendWhatsAppMessages, type WhatsAppSendResult } from '@/services/meta_whatsapp'
import pb from '@/lib/pocketbase/client'

interface WhatsAppSendModalProps {
  isOpen: boolean
  onClose: () => void
  customers: Array<{ id: string; name?: string; phone?: string; phone_1_value?: string }>
}

export function WhatsAppSendModal({ isOpen, onClose, customers }: WhatsAppSendModalProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<WhatsAppSendResult | null>(null)

  const validCustomers = customers.filter(
    (c) => (c.phone && c.phone.trim()) || (c.phone_1_value && c.phone_1_value.trim()),
  )

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Digite uma mensagem')
      return
    }
    setSending(true)
    try {
      const recipients = validCustomers.map((c) => ({
        phone: c.phone_1_value || c.phone || '',
        name: c.name || '',
      }))
      const res = await sendWhatsAppMessages(recipients, message.trim())
      setResult(res)

      const sentPhones = new Set(res.results.filter((r) => r.status === 'sent').map((r) => r.phone))
      const now = new Date().toISOString()
      await Promise.all(
        validCustomers
          .filter((c) => sentPhones.has(c.phone_1_value || c.phone || ''))
          .map((c) =>
            pb
              .collection('customers')
              .update(c.id, { last_sent_at: now })
              .catch(() => {}),
          ),
      )

      if (res.failed === 0) {
        toast.success(`${res.success} mensagens enviadas`)
      } else {
        toast.error(`${res.success} enviadas, ${res.failed} falharam`)
      }
    } catch (err) {
      toast.error('Erro ao enviar mensagens')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    setResult(null)
    setMessage('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar Mensagem WhatsApp</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-3 text-sm">
              <span className="font-semibold text-primary">{validCustomers.length}</span>{' '}
              destinatario(s) com telefone valido de{' '}
              <span className="font-semibold">{customers.length}</span> selecionado(s)
            </div>
            <div className="space-y-2">
              <Label>Mensagem</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                rows={4}
                maxLength={4096}
              />
              <p className="text-xs text-muted-foreground">{message.length}/4096 caracteres</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold">{result.total}</div>
                <div className="text-xs text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-green-600">{result.success}</div>
                <div className="text-xs text-muted-foreground">Sucesso</div>
              </div>
              <div className="rounded-lg border p-3">
                <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                <div className="text-xs text-muted-foreground">Falhas</div>
              </div>
            </div>
            {result.results.some((r) => r.status === 'failed') && (
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-1">
                  {result.results
                    .filter((r) => r.status === 'failed')
                    .map((r, i) => (
                      <div key={i} className="text-xs flex items-start gap-2">
                        <AlertCircle className="h-3 w-3 text-red-500 mt-0.5 shrink-0" />
                        <span className="font-medium">{r.name || r.phone}:</span>
                        <span className="text-muted-foreground">{r.error}</span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={handleClose} className="w-full">
              Concluir
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={sending}>
                Cancelar
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || validCustomers.length === 0 || !message.trim()}
                className="min-w-[200px]"
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Mensagem para {validCustomers.length} destinatário(s)
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
