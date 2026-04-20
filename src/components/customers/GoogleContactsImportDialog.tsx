import { useState, useRef } from 'react'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { deleteAllCustomers, createCustomerWithRetry } from '@/services/customers'
import pb from '@/lib/pocketbase/client'
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react'

function parseCSV(str: string) {
  const result = []
  let row = []
  let inQuotes = false
  let val = ''
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '"') {
      if (inQuotes && str[i + 1] === '"') {
        val += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(val)
      val = ''
    } else if (char === '\n' && !inQuotes) {
      row.push(val)
      result.push(row)
      row = []
      val = ''
    } else if (char === '\r' && !inQuotes) {
      // ignore
    } else {
      val += char
    }
  }
  row.push(val)
  if (row.length > 0 || val !== '') {
    result.push(row)
  }

  const headers = result[0] || []
  const data = []
  for (let i = 1; i < result.length; i++) {
    if (result[i].length === 1 && result[i][0] === '') continue
    const obj: any = {}
    headers.forEach((h, j) => {
      if (h) obj[h.trim()] = result[i][j]
    })
    data.push(obj)
  }
  return data
}

const formatPhone = (phone: string) => {
  if (!phone) return ''
  const digits = phone.toString().replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 11) {
    return digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
  }
  return phone.trim()
}

export function GoogleContactsImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [jsonInput, setJsonInput] = useState('')
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [failedRecords, setFailedRecords] = useState<any[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const text = await file.text()
    try {
      let data: any[]
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = parseCSV(text)
      } else {
        data = JSON.parse(text)
      }

      if (!Array.isArray(data)) {
        throw new Error('O arquivo deve conter um array de registros.')
      }
      setParsedData(data)
      setFailedRecords([])
      toast({ title: `Arquivo carregado com ${data.length} contatos prontos para importação.` })
    } catch (err: any) {
      toast({
        title: 'Erro ao ler arquivo',
        description: err.message,
        variant: 'destructive',
      })
      setParsedData(null)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleParseText = () => {
    try {
      const data = JSON.parse(jsonInput)
      if (!Array.isArray(data)) {
        throw new Error('O JSON deve ser um array de objetos.')
      }
      setParsedData(data)
      setFailedRecords([])
      toast({ title: `Texto carregado com ${data.length} contatos.` })
    } catch (err: any) {
      toast({ title: 'JSON inválido', description: err.message, variant: 'destructive' })
    }
  }

  const handleImport = async (recordsToProcess = parsedData) => {
    if (!recordsToProcess) return

    try {
      setImporting(true)
      setProgress({ current: 0, total: recordsToProcess.length, message: 'Iniciando...' })

      if (mode === 'replace' && recordsToProcess === parsedData) {
        setProgress((p) => ({ ...p, message: 'Limpando base atual...' }))
        await deleteAllCustomers()
      }

      setProgress((p) => ({ ...p, message: 'Verificando contatos existentes (Idempotência)...' }))

      const existing = await pb.collection('customers').getFullList({
        fields: 'email_1_value,phone_1_value,email,phone',
      })

      const uniqueEmails = new Set(
        existing.flatMap((c) => [c.email_1_value, c.email]).filter(Boolean),
      )
      const uniquePhones = new Set(
        existing.flatMap((c) => [c.phone_1_value, c.phone]).filter(Boolean),
      )

      let successCount = 0
      let newFailed: any[] = []

      const batchSize = 50
      for (let i = 0; i < recordsToProcess.length; i += batchSize) {
        const batch = recordsToProcess.slice(i, i + batchSize)
        setProgress({
          current: i,
          total: recordsToProcess.length,
          message: `Importando lote (${i} de ${recordsToProcess.length})...`,
        })

        const promises = batch.map(async (item) => {
          const givenName = (item['Given Name'] || '').trim()
          const middleName = (item['Additional Name'] || '').trim()
          const familyName = (item['Family Name'] || '').trim()

          const fullName = (item['Name'] || '').trim()
          const nameRaw = fullName || [givenName, middleName, familyName].filter(Boolean).join(' ')
          const name = nameRaw || 'Sem Nome'

          const emailLabel = (item['E-mail 1 - Type'] || '').trim()
          const emailValue = (item['E-mail 1 - Value'] || '').trim()

          const phoneLabel = (item['Phone 1 - Type'] || '').trim()
          const rawPhone = item['Phone 1 - Value'] || ''
          const phoneValue = formatPhone(rawPhone)

          const orgName = (item['Organization 1 - Name'] || '').trim()
          const orgTitle = (item['Organization 1 - Title'] || '').trim()
          const birthday = (item['Birthday'] || '').trim()
          const notes = (item['Notes'] || '').trim()

          // Skip completely blank lines
          if (!nameRaw && !emailValue && !phoneValue) return Promise.resolve('skipped')

          // Prevent Duplicates based on email/phone matching existing DB records
          if (emailValue && uniqueEmails.has(emailValue)) return Promise.resolve('skipped')
          if (phoneValue && uniquePhones.has(phoneValue)) return Promise.resolve('skipped')

          if (emailValue) uniqueEmails.add(emailValue)
          if (phoneValue) uniquePhones.add(phoneValue)

          return createCustomerWithRetry({
            name,
            first_name: givenName,
            middle_name: middleName,
            last_name: familyName,
            email: emailValue,
            email_1_label: emailLabel,
            email_1_value: emailValue,
            phone: phoneValue,
            phone_1_label: phoneLabel,
            phone_1_value: phoneValue,
            org_name: orgName,
            org_title: orgTitle,
            birthday,
            notes,
            source: 'Google Contacts',
            status: '1', // Lead
            tags: ['Importado', 'Google Contacts'],
          })
        })

        const results = await Promise.allSettled(promises)

        results.forEach((res, idx) => {
          if (res.status === 'rejected') {
            newFailed.push(batch[idx])
          } else if (res.value !== 'skipped') {
            successCount++
          }
        })

        setProgress({
          current: Math.min(i + batch.length, recordsToProcess.length),
          total: recordsToProcess.length,
          message: `Processados ${Math.min(i + batch.length, recordsToProcess.length)} de ${recordsToProcess.length}...`,
        })

        // Avoid hammering Pocketbase too hard and keep UI responsive
        await new Promise((r) => setTimeout(r, 100))
      }

      if (newFailed.length > 0) {
        setFailedRecords(newFailed)
        toast({
          title: `Importação parcial`,
          description: `${successCount} contatos importados. ${newFailed.length} falharam na rede.`,
          variant: 'destructive',
        })
        if (successCount > 0) onSuccess()
      } else {
        toast({
          title: `Contatos importados com sucesso!`,
          description: `${successCount} novos contatos adicionados.`,
        })
        onSuccess()
        setTimeout(() => {
          onOpenChange(false)
          setParsedData(null)
          setJsonInput('')
          setMode('append')
          setFailedRecords([])
        }, 1500)
      }
    } catch (err: any) {
      toast({
        title: 'Erro na importação',
        description: err.message || 'Erro de servidor.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  const resetData = () => {
    setParsedData(null)
    setJsonInput('')
    setFailedRecords([])
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!importing) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Importar Google Contacts</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV exportado do Google Contacts ou JSON para importar seus
            contatos. O sistema ignorará contatos duplicados automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!parsedData ? (
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <Label>Modo de Importação</Label>
              <RadioGroup
                value={mode}
                onValueChange={(v: any) => setMode(v)}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="append" id="r1" />
                  <Label htmlFor="r1" className="cursor-pointer">
                    Adicionar (Manter base atual e ignorar duplicados)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="replace" id="r2" />
                  <Label htmlFor="r2" className="cursor-pointer text-destructive">
                    Substituir Base (Apagar todos os clientes atuais)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label>Upload de Arquivo (CSV Google Contacts)</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <UploadCloud className="mr-2 h-4 w-4" /> Selecionar Arquivo
                </Button>
                <input
                  type="file"
                  accept=".csv,.json"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Ou cole o JSON manualmente</Label>
              <Textarea
                placeholder={`[\n  {\n    "Given Name": "João",\n    "Family Name": "Silva",\n    "E-mail 1 - Value": "joao@example.com",\n    "Phone 1 - Value": "11987654321",\n    "Organization 1 - Name": "Empresa X"\n  }\n]`}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                className="h-32 font-mono text-sm"
              />
              <Button
                variant="secondary"
                onClick={handleParseText}
                disabled={!jsonInput.trim()}
                className="w-full"
              >
                Processar Texto JSON
              </Button>
            </div>
          </div>
        ) : failedRecords.length > 0 ? (
          <div className="py-4 space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
              <h3 className="font-semibold text-lg">{failedRecords.length} registros falharam</h3>
              <p className="text-sm text-muted-foreground text-center">
                A importação sofreu instabilidades de rede. Você pode tentar importar apenas as
                falhas novamente.
              </p>
              <Button
                className="mt-4"
                onClick={() => handleImport(failedRecords)}
                disabled={importing}
              >
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Tentar novamente falhas
              </Button>
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progress.message}</span>
                  <span>
                    {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="py-4 space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg border border-dashed">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <h3 className="font-semibold text-lg">{parsedData.length} registros prontos!</h3>
              <p className="text-sm text-muted-foreground text-center">
                As colunas do Google Contacts foram identificadas e mapeadas com sucesso.
              </p>

              {mode === 'replace' && (
                <p className="text-sm font-medium text-destructive mt-4 text-center">
                  ⚠️ Atenção: Todos os clientes atuais serão apagados antes da importação.
                </p>
              )}
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progress.message}</span>
                  <span>
                    {progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}
                    %
                  </span>
                </div>
                <Progress
                  value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => {
              if (parsedData && !importing) resetData()
              else if (!importing) onOpenChange(false)
            }}
            disabled={importing}
          >
            {parsedData && !importing ? 'Voltar' : 'Cancelar'}
          </Button>

          {parsedData && failedRecords.length === 0 && (
            <Button
              variant={mode === 'replace' ? 'destructive' : 'default'}
              onClick={() => handleImport()}
              disabled={importing}
            >
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
