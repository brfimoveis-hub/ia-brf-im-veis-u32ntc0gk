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
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { createCustomerWithRetry, updateCustomer } from '@/services/customers'
import pb from '@/lib/pocketbase/client'
import { Loader2, UploadCloud, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { formatPhone } from '@/lib/utils'

function parseCSV(str: string) {
  const firstLine = str.split('\n')[0] || ''
  const delimiter = firstLine.split(';').length > firstLine.split(',').length ? ';' : ','

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
    } else if (char === delimiter && !inQuotes) {
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

const mapRow = (item: any) => {
  const getVal = (keys: string[]) => {
    for (const key of keys) {
      const found = Object.keys(item).find((k) => k.toLowerCase().trim() === key.toLowerCase())
      if (found && item[found]) return item[found]
    }
    return ''
  }

  const name = getVal(['name', 'nome', 'display name', 'nome de exibição'])
  const givenName = getVal(['given name', 'first name', 'nome próprio'])
  const lastName = getVal(['family name', 'last name', 'sobrenome'])
  const email = getVal(['e-mail 1 - value', 'e-mail', 'email', 'correio eletrônico'])
  const phone = getVal([
    'phone 1 - value',
    'phone',
    'mobile',
    'telefone',
    'celular',
    'telefone 1 - valor',
  ])
  const orgName = getVal(['organization 1 - name', 'empresa', 'company'])

  let fallbackEmail = email
  let fallbackPhone = phone

  if (!fallbackEmail || !fallbackPhone) {
    for (const rawVal of Object.values(item)) {
      if (rawVal) {
        const val = String(rawVal)
        if (!fallbackEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
          fallbackEmail = val
        }
        if (!fallbackPhone && /[\d()\-+]{8,15}/.test(val) && val.replace(/\D/g, '').length >= 8) {
          fallbackPhone = val
        }
      }
    }
  }

  return {
    ...item,
    NormalizedName: name,
    NormalizedGivenName: givenName,
    NormalizedLastName: lastName,
    NormalizedEmail: fallbackEmail,
    NormalizedPhone: fallbackPhone,
    NormalizedOrg: orgName,
  }
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
  const [jsonInput, setJsonInput] = useState('')
  const [parsedData, setParsedData] = useState<any[] | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, message: '' })
  const [failedRecords, setFailedRecords] = useState<any[]>([])
  const [ignoredCount, setIgnoredCount] = useState(0)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const downloadSampleCSV = () => {
    const headers =
      'Name,Given Name,Family Name,Phone 1 - Value,E-mail 1 - Value,Organization 1 - Name\n'
    const sample = 'João da Silva,João,Silva,11999999999,joao@exemplo.com,Empresa Exemplo\n'
    const blob = new Blob([headers + sample], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'modelo_importacao.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const processParsedData = (data: any[]) => {
    let ignored = 0
    const mappedData = data.map(mapRow)
    const validData = mappedData.filter((item) => {
      const isValid = item.NormalizedEmail || item.NormalizedPhone
      if (!isValid && Object.keys(item).length > 0) ignored++
      return isValid
    })

    if (validData.length === 0) {
      toast({
        title: 'Aviso',
        description:
          'Verifique se o seu arquivo CSV utiliza vírgula ou ponto-e-vírgula e se contém pelo menos uma coluna com Email ou Telefone válidos.',
        variant: 'destructive',
      })
      setParsedData(null)
      return false
    }

    setParsedData(validData)
    setFailedRecords([])
    setIgnoredCount(ignored)
    return true
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    toast({ title: 'Processando...', description: 'Lendo o arquivo, aguarde.' })

    const text = await file.text()
    try {
      let data: any[]
      if (file.name.toLowerCase().endsWith('.csv')) {
        data = parseCSV(text)
      } else {
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error('Invalid file format')
        }
      }

      if (!Array.isArray(data)) {
        throw new Error('Invalid file format')
      }

      const success = processParsedData(data)
      if (success) {
        toast({
          title: 'Sucesso',
          description: 'Arquivo carregado com sucesso. Verifique os dados e confirme a importação.',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message === 'Invalid file format' ? err.message : 'Invalid file format',
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
        throw new Error('Invalid file format')
      }

      const success = processParsedData(data)
      if (success) {
        toast({
          title: 'Sucesso',
          description: 'Texto carregado com sucesso. Confirme a importação.',
        })
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: 'Formato de arquivo inválido.', variant: 'destructive' })
    }
  }

  const handleImport = async (recordsToProcess = parsedData) => {
    if (!recordsToProcess) return

    try {
      setImporting(true)
      setProgress({
        current: 0,
        total: recordsToProcess.length,
        message: 'Iniciando importação segura (Upsert)...',
      })

      const existing = await pb.collection('customers').getFullList({
        fields: 'id,email_1_value,phone_1_value,email,phone',
      })

      const emailMap = new Map()
      const phoneMap = new Map()
      existing.forEach((c) => {
        if (c.email) emailMap.set(c.email, c.id)
        if (c.email_1_value) emailMap.set(c.email_1_value, c.id)
        if (c.phone) phoneMap.set(c.phone, c.id)
        if (c.phone_1_value) phoneMap.set(c.phone_1_value, c.id)
      })

      let successCount = 0
      let newFailed: any[] = []
      const userId = pb.authStore.record?.id

      const batchSize = 25
      for (let i = 0; i < recordsToProcess.length; i += batchSize) {
        const batch = recordsToProcess.slice(i, i + batchSize)
        setProgress({
          current: i,
          total: recordsToProcess.length,
          message: `Processando lote (${i} de ${recordsToProcess.length})...`,
        })

        const promises = batch.map(async (item) => {
          let givenName = (item.NormalizedGivenName || '').trim()
          const middleName = (item['Additional Name'] || '').trim()
          let familyName = (item.NormalizedLastName || '').trim()

          const rawName = (item.NormalizedName || '').trim()

          let fullName = rawName
          if (!fullName) {
            fullName = [givenName, middleName, familyName].filter(Boolean).join(' ')
          }

          if (fullName && !givenName && !familyName) {
            const parts = fullName.split(' ')
            givenName = parts[0] || ''
            familyName = parts.length > 1 ? parts.slice(1).join(' ') : ''
          }

          const name = fullName || 'Sem nome'

          const emailLabel = (item['E-mail 1 - Type'] || '').trim()
          const emailValue = (item.NormalizedEmail || '').trim()

          const phone1Label = (item['Phone 1 - Type'] || '').trim()
          const phone1Value = formatPhone(item.NormalizedPhone || '')

          const phoneValue = phone1Value

          const orgName = (item.NormalizedOrg || '').trim()
          const orgTitle = (item['Organization 1 - Title'] || '').trim()

          // Non-blocking parsing for generic fields
          const birthday = (item['Birthday'] || '').trim()
          const notes = (item['Notes'] || '').trim()

          if (!emailValue && !phoneValue) return Promise.resolve('skipped')

          let existingId = null
          if (emailValue && emailMap.has(emailValue)) existingId = emailMap.get(emailValue)
          else if (phoneValue && phoneMap.has(phoneValue)) existingId = phoneMap.get(phoneValue)

          const payload: any = {
            user_id: userId,
            name,
            first_name: givenName,
            middle_name: middleName,
            last_name: familyName,
            email: emailValue,
            email_1_label: emailLabel,
            email_1_value: emailValue,
            phone: phoneValue,
            phone_1_label: phone1Label,
            phone_1_value: phone1Value,
            org_name: orgName,
            org_title: orgTitle,
            birthday,
            notes,
            source: 'Google Contacts',
          }

          if (existingId) {
            return updateCustomer(existingId, payload)
          } else {
            payload.status = 'Novo'
            payload.tags = ['Importado']
            const created = await createCustomerWithRetry(payload)
            if (emailValue) emailMap.set(emailValue, created.id)
            if (phoneValue) phoneMap.set(phoneValue, created.id)
            return created
          }
        })

        const results = await Promise.allSettled(promises)

        results.forEach((res, idx) => {
          if (res.status === 'rejected') {
            console.error('Import failed for row', batch[idx], res.reason)
            newFailed.push(batch[idx])
          } else if (res.value !== 'skipped') {
            successCount++
          }
        })

        setProgress({
          current: Math.min(i + batch.length, recordsToProcess.length),
          total: recordsToProcess.length,
          message: `Atualizados/Inseridos ${Math.min(i + batch.length, recordsToProcess.length)} de ${recordsToProcess.length}...`,
        })

        await new Promise((r) => setTimeout(r, 200))
      }

      const totalIgnored = newFailed.length + ignoredCount

      if (totalIgnored > 0) {
        setFailedRecords(newFailed)
        toast({
          title: `Importação concluída com avisos`,
          description: `Importação concluída com avisos: ${successCount} contatos importados e mapeados automaticamente, ${totalIgnored} linhas ignoradas.`,
          variant: 'destructive',
        })
        if (successCount > 0) onSuccess()
      } else {
        toast({
          title: `Sucesso!`,
          description: `${successCount} contatos importados e mapeados automaticamente.`,
        })
        onSuccess()
        setTimeout(() => {
          onOpenChange(false)
          setParsedData(null)
          setJsonInput('')
          setFailedRecords([])
          setIgnoredCount(0)
        }, 1500)
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: 'Erro de conexão ou falha inesperada na importação.',
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
    setIgnoredCount(0)
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
          <DialogTitle>Importar Contatos</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV exportado do Google Contacts ou cole um JSON. O sistema
            atualizará de forma segura os contatos já existentes (verificando email ou telefone) e
            adicionará os novos automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!parsedData ? (
          <div className="py-4 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label>Upload de Arquivo (CSV)</Label>
                <Button
                  variant="link"
                  size="sm"
                  onClick={downloadSampleCSV}
                  className="h-auto p-0 text-primary"
                >
                  <Download className="mr-1 h-3 w-3" /> Baixar modelo CSV
                </Button>
              </div>
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
                As colunas foram identificadas e mapeadas com sucesso.{' '}
                {ignoredCount > 0 && (
                  <span className="text-destructive font-medium block mt-1">
                    ({ignoredCount} linhas ignoradas com falhas de formato)
                  </span>
                )}
              </p>
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
            <Button onClick={() => handleImport()} disabled={importing}>
              {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {importing ? 'Importando...' : 'Confirmar Importação'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
