import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'
import { bulkSendEmail } from '@/services/email'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { TemplateSelector } from './TemplateSelector'
import { RichTextEditor } from './RichTextEditor'
import { Loader2, Mail, Send, AlertCircle, Users } from 'lucide-react'

interface BulkEmailModalProps {
  isOpen: boolean
  onClose: () => void
  customers: Array<{ id: string; name: string; email?: string; email_1_value?: string }>
}

export function BulkEmailModal({ isOpen, onClose, customers }: BulkEmailModalProps) {
  const { toast } = useToast()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const validRecipients = useMemo(
    () => customers.filter((c) => c.email?.trim() || c.email_1_value?.trim()),
    [customers],
  )
  const invalidCount = customers.length - validRecipients.length

  const handleSend = async () => {
    if (!subject.trim() || !body.trim() || validRecipients.length === 0) return
    setSending(true)
    try {
      const result = await bulkSendEmail(
        validRecipients.map((c) => c.id),
        subject.trim(),
        body.trim(),
      )
      toast({ title: 'Emails enviados!', description: result.message })
      setSubject('')
      setBody('')
      onClose()
    } catch (error: unknown) {
      toast({
        title: 'Erro ao enviar emails',
        description: getErrorMessage(error),
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
            Enviar Email em Massa
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {validRecipients.length} destinatário(s)
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  {invalidCount} sem email
                </Badge>
              )}
            </div>

            {invalidCount > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 text-xs">
                  {invalidCount} contato(s) serão ignorados por não terem endereço de email válido.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Template</Label>
              <TemplateSelector
                onSelect={(content) => setBody(content.replace(/\n/g, '<br>'))}
                disabled={sending}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-subject">Assunto</Label>
              <Input
                id="bulk-subject"
                placeholder="Digite o assunto..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bulk-body">Mensagem</Label>
              <RichTextEditor
                value={body}
                onChange={setBody}
                disabled={sending}
                placeholder="Digite a mensagem que será enviada..."
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Placeholders: {'{{name}}, {{first_name}}, {{email}}, {{phone}}'}
            </p>
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
            disabled={sending || !subject.trim() || !body.trim() || validRecipients.length === 0}
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
                Enviar para {validRecipients.length}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
