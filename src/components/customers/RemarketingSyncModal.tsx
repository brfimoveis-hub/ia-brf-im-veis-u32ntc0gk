import { useState, useEffect } from 'react'
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
import { syncRemarketing, Customer } from '@/services/customers'
import pb from '@/lib/pocketbase/client'
import { Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface RemarketingSyncModalProps {
  isOpen: boolean
  onClose: () => void
  searchTerm?: string
  phaseFilter?: string
  sourceFilter?: string
}

export function RemarketingSyncModal({
  isOpen,
  onClose,
  searchTerm = '',
  phaseFilter = 'all',
  sourceFilter = '',
}: RemarketingSyncModalProps) {
  const { toast } = useToast()
  const { user } = useAuth()
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [validLeads, setValidLeads] = useState<Customer[]>([])
  const [totalFiltered, setTotalFiltered] = useState(0)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const fetchFilteredLeads = async () => {
      setIsLoading(true)
      try {
        const filters: string[] = []
        if (searchTerm) {
          const safeSearch = searchTerm.replace(/"/g, '\\"')
          filters.push(
            `(name ~ "${safeSearch}" || email ~ "${safeSearch}" || phone ~ "${safeSearch}" || first_name ~ "${safeSearch}" || email_1_value ~ "${safeSearch}" || phone_1_value ~ "${safeSearch}")`,
          )
        }
        if (phaseFilter && phaseFilter !== 'all') {
          const safePhase = phaseFilter.replace(/"/g, '\\"')
          filters.push(`status = "${safePhase}"`)
        }
        if (sourceFilter) {
          const safeSource = sourceFilter.replace(/"/g, '\\"')
          filters.push(`source ~ "${safeSource}"`)
        }

        const filterString = filters.join(' && ')

        const allLeads = await pb.collection('customers').getFullList<Customer>({
          filter: filterString,
          requestKey: null,
        })

        setTotalFiltered(allLeads.length)

        const valid = allLeads.filter((l) => {
          const hasEmail =
            (l.email && l.email.trim() !== '') || (l.email_1_value && l.email_1_value.trim() !== '')
          const hasPhone =
            (l.phone && l.phone.trim() !== '') || (l.phone_1_value && l.phone_1_value.trim() !== '')
          return hasEmail || hasPhone
        })

        setValidLeads(valid)
      } catch (error) {
        console.error('Error fetching leads for sync:', error)
        toast({
          title: 'Erro ao carregar leads',
          description: 'Não foi possível carregar os leads para sincronização.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchFilteredLeads()
  }, [isOpen, searchTerm, phaseFilter, sourceFilter, toast])

  const handleSync = async () => {
    if (!user?.meta_pixel_id || !user?.meta_capi_token) {
      setSyncError(
        'O ID do Pixel ou o Token da API de Conversões não estão configurados. Vá para Configurações para preenchê-los.',
      )
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    try {
      const ids = validLeads.map((l) => l.id)
      const result = await syncRemarketing(ids, searchTerm, 'Lead')
      toast({
        title: 'Sincronização concluída',
        description: `${result.synced} leads foram sincronizados com sucesso.`,
      })
      onClose()
    } catch (error: any) {
      let errorMsg =
        error.response?.message || error.message || 'Ocorreu um erro ao sincronizar com o Meta.'
      setSyncError(errorMsg)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sincronizar Remarketing (Meta CAPI)</DialogTitle>
          <DialogDescription asChild className="space-y-4 pt-4 text-base text-foreground">
            <div>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <p>
                    Isso enviará {totalFiltered} leads
                    {searchTerm ? ` filtrados pela busca '${searchTerm}'` : ' filtrados'} para o
                    Meta, permitindo criar campanhas segmentadas.
                  </p>
                  <p>
                    <strong>Evento de Conversão / Tag:</strong> Lead (Padrão)
                  </p>
                  <div className="text-sm text-muted-foreground bg-muted p-4 rounded-md border">
                    Apenas contatos com email ou telefone válidos serão sincronizados via hash
                    SHA256 para manter a segurança e conformidade com o Meta.
                    <span className="block mt-2 font-medium text-foreground">
                      ({validLeads.length} contatos válidos encontrados)
                    </span>
                  </div>
                  {syncError && (
                    <div className="mt-4 p-4 rounded-md border border-destructive bg-destructive/10 text-destructive text-sm font-medium">
                      Falha na sincronização: {syncError}
                    </div>
                  )}
                </>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSyncing || isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSync} disabled={isSyncing || isLoading || validLeads.length === 0}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Confirmar Envio'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
