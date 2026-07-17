import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { sendEmail } from '@/services/email'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Loader2, Mail, Send } from 'lucide-react'

interface EmailComposerModalProps {
  customerId: string
  customerName: string
  customerEmail: string
  isOpen: boolean
  onClose: () => void
}

export function EmailComposerModal({
  customerId,
  customerName,
  customerEmail,
  isOpen,
  onClose,
}: EmailComposerModalProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) return
    setSending(true)
    try {
      const result = await sendEmail(customerId, subject.trim(), body.trim())
      toast({
        title: 'Email enviado!',
        description: `Enviado para ${result.recipient || customerEmail}`,
      })
      setSubject('')
      setBody('')
      onClose()
    } catch (error: unknown) {
      const msg = getErrorMessage(error)
      toast({
        title: 'Erro ao enviar email',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (sending) return
    setSubject('')
    setBody('')
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Compor Email
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Para</Label>
              <div className="bg-muted/50 rounded-md px-3 py-2 text-sm font-medium border">
                {customerName}{' '}
                <span className="text-muted-foreground">&lt;{customerEmail}&gt;</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-subject">Assunto</Label>
              <Input
                id="email-subject"
                placeholder="Digite o assunto do email..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email-body">Mensagem</Label>
              <Textarea
                id="email-body"
                placeholder="Digite a mensagem que será enviada ao cliente..."
                className="min-h-[220px] resize-y"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                disabled={sending}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim()}
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
                Enviar Email
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
