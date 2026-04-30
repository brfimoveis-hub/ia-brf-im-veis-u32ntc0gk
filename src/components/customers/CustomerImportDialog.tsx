import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Upload, FileText, FileBadge, Loader2 } from 'lucide-react'
import { createCustomerWithRetry } from '@/services/customers'

export function CustomerImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setProgress(10)

    try {
      const text = await file.text()
      const isVcf = file.name.endsWith('.vcf')
      const isCsv = file.name.endsWith('.csv')

      const parsedContacts: any[] = []

      if (isCsv) {
        const lines = text.split('\n')
        if (lines.length > 0) {
          const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())

          for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue
            const values = lines[i].split(',')
            const contact: any = {}
            headers.forEach((h, idx) => {
              if (values[idx]) contact[h] = values[idx].trim()
            })

            if (
              contact.name ||
              contact.email ||
              contact.phone ||
              contact.first_name ||
              contact.telefone
            ) {
              parsedContacts.push({
                name: contact.name || contact.first_name || 'Sem nome',
                email: contact.email || '',
                phone: contact.phone || contact.telefone || '',
                status: 'Base de Clientes/Novo LYD',
                source: 'Importação CSV',
              })
            }
          }
        }
      } else if (isVcf) {
        const vcards = text.split('BEGIN:VCARD')
        for (const card of vcards) {
          if (!card.trim()) continue
          const lines = card.split('\n')
          let name = ''
          let phone = ''
          let email = ''

          for (const line of lines) {
            if (line.startsWith('FN:')) name = line.substring(3).trim()
            if (line.startsWith('TEL')) {
              const parts = line.split(':')
              if (parts.length > 1) phone = parts[1].trim()
            }
            if (line.startsWith('EMAIL')) {
              const parts = line.split(':')
              if (parts.length > 1) email = parts[1].trim()
            }
          }

          if (name || phone || email) {
            parsedContacts.push({
              name: name || 'Sem nome',
              phone,
              email,
              status: 'Base de Clientes/Novo LYD',
              source: 'Importação VCF',
            })
          }
        }
      }

      if (parsedContacts.length === 0) {
        throw new Error('Nenhum contato válido encontrado no arquivo.')
      }

      let successCount = 0
      for (let i = 0; i < parsedContacts.length; i++) {
        try {
          await createCustomerWithRetry(parsedContacts[i])
          successCount++
        } catch {
          // Skip failures
        }
        setProgress(10 + Math.round((successCount / parsedContacts.length) * 90))
      }

      toast({
        title: 'Importação Concluída',
        description: `${successCount} contatos importados com sucesso.`,
      })
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Erro na importação',
        description: error.message || 'Falha ao processar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importar Base de Clientes</DialogTitle>
          <DialogDescription>
            Faça upload de arquivos CSV ou VCF para adicionar leads massivamente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 gap-4 border-2 border-dashed rounded-lg border-muted-foreground/20 bg-muted/10">
          {isUploading ? (
            <div className="flex flex-col items-center gap-4 w-full px-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-sm font-medium">Processando... {progress}%</div>
              <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-4 mb-2">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileText className="h-8 w-8" />
                  <span className="text-xs font-semibold uppercase">CSV</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <FileBadge className="h-8 w-8" />
                  <span className="text-xs font-semibold uppercase">VCF / vCard</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv,.vcf"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" /> Selecionar Arquivo
              </Button>
              <p className="text-xs text-muted-foreground text-center px-4 mt-2">
                O arquivo deve conter colunas/campos para Nome, Email e Telefone. O status inicial
                será "Base de Clientes/Novo LYD".
              </p>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
