import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { syncRemarketing } from '@/services/customers'
import { Customer } from '@/services/customers'

interface RemarketingSyncModalProps {
  isOpen: boolean
  onClose: () => void
  leads: Customer[]
  searchTerm?: string
}

export function RemarketingSyncModal({
  isOpen,
  onClose,
  leads,
  searchTerm,
}: RemarketingSyncModalProps) {
  const { toast } = useToast()
  const [isSyncing, setIsSyncing] = useState(false)

  const validLeads = leads.filter((l) => {
    const hasEmail =
      (l.email && l.email.trim() !== '') || (l.email_1_value && l.email_1_value.trim() !== '')
    const hasPhone =
      (l.phone && l.phone.trim() !== '') || (l.phone_1_value && l.phone_1_value.trim() !== '')
    return hasEmail || hasPhone
  })

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      const ids = validLeads.map((l) => l.id)
      const result = await syncRemarketing(ids, searchTerm || '', 'Lead')
      toast({
        title: 'Sincronização concluída',
        description: `${result.synced} leads foram sincronizados com sucesso.`,
      })
      onClose()
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Ocorreu um erro ao sincronizar com o Meta.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sincronizar Remarketing (Meta CAPI)</DialogTitle>
          <DialogDescription className="space-y-4 pt-4 text-base text-foreground">
            <p>
              Isso enviará {leads.length} leads
              {searchTerm ? ` filtrados pela busca '${searchTerm}'` : ' filtrados'} para o Meta,
              permitindo criar campanhas segmentadas.
            </p>
            <p>
              <strong>Evento de conversão:</strong> Lead (Padrão)
            </p>
            <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md border">
              Apenas contatos com email ou telefone válidos serão sincronizados via hash SHA256 para
              manter a segurança e conformidade com o Meta.
              <span className="block mt-2 font-medium text-foreground">
                ({validLeads.length} contatos válidos encontrados)
              </span>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSyncing}>
            Cancelar
          </Button>
          <Button onClick={handleSync} disabled={isSyncing || validLeads.length === 0}>
            {isSyncing ? 'Sincronizando...' : 'Confirmar Envio'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
