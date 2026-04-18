import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { deleteAllCustomers, createCustomer } from '@/services/customers'
import { Loader2 } from 'lucide-react'

export function ZapVivaImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [jsonInput, setJsonInput] = useState('')
  const [importing, setImporting] = useState(false)
  const { toast } = useToast()

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.length === 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
    }
    return phone
  }

  const handleImport = async () => {
    try {
      setImporting(true)
      const data = JSON.parse(jsonInput)
      if (!Array.isArray(data)) {
        throw new Error('O JSON deve ser um array de objetos.')
      }

      await deleteAllCustomers()

      const uniqueEmails = new Set()
      let successCount = 0

      for (const item of data) {
        const name = item['Nome Completo'] || 'Sem Nome'
        const email = item['Email'] || ''
        const phone = formatPhone(item['Telefone'] || '')
        const address = item['Endereço'] || ''
        const source = item['Lead Source'] || ''

        if (email && uniqueEmails.has(email)) {
          continue // skip duplicates
        }
        if (email) uniqueEmails.add(email)

        await createCustomer({
          name,
          email,
          email_1_value: email,
          phone,
          phone_1_value: phone,
          address_1_formatted: address,
          source,
          status: '1', // Lead Novo
          tags: ['Zap/Viva'],
        })
        successCount++
      }

      toast({ title: `${successCount} Leads importados com sucesso!` })
      onSuccess()
      onOpenChange(false)
      setJsonInput('')
    } catch (err: any) {
      toast({
        title: 'Erro na importação',
        description: err.message || 'JSON inválido ou erro de servidor.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Reset & Import Zap/Viva Leads</DialogTitle>
          <DialogDescription className="text-destructive font-semibold">
            ATENÇÃO: Isso irá APAGAR TODOS os seus clientes atuais e importar os novos a partir do
            JSON fornecido.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder={`[\n  {\n    "Nome Completo": "João Silva",\n    "Email": "joao@example.com",\n    "Telefone": "11987654321",\n    "Endereço": "Rua A, 123",\n    "Lead Source": "Zap"\n  }\n]`}
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            className="h-64 font-mono text-sm"
            disabled={importing}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleImport} disabled={importing || !jsonInput}>
            {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {importing ? 'Importando...' : 'Substituir e Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
