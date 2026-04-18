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
import { deleteAllCustomers, createCustomer } from '@/services/customers'
import { Loader2, UploadCloud, CheckCircle2 } from 'lucide-react'

// Simple robust CSV Parser
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

  const headers = result[0]
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

export function ZapVivaImportDialog({
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const formatPhone = (phone: string) => {
    if (!phone) return ''
    const digits = phone.toString().replace(/\D/g, '')
    return digits.replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3')
  }

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
      toast({ title: `Arquivo carregado com ${data.length} registros prontos para importação.` })
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
      toast({ title: `Texto carregado com ${data.length} registros.` })
    } catch (err: any) {
      toast({ title: 'JSON inválido', description: err.message, variant: 'destructive' })
    }
  }

  const handleImport = async () => {
    if (!parsedData) return

    try {
      setImporting(true)
      setProgress({ current: 0, total: parsedData.length, message: 'Iniciando...' })

      if (mode === 'replace') {
        setProgress((p) => ({ ...p, message: 'Limpando base atual...' }))
        await deleteAllCustomers()
      }

      const uniqueEmails = new Set()
      const uniquePhones = new Set()
      let successCount = 0

      const batchSize = 50
      for (let i = 0; i < parsedData.length; i += batchSize) {
        const batch = parsedData.slice(i, i + batchSize)
        setProgress({
          current: i,
          total: parsedData.length,
          message: `Importando ${i} de ${parsedData.length}...`,
        })

        await Promise.all(
          batch.map(async (item) => {
            const nomeCompleto =
              item['Nome Completo'] || item['nome_completo'] || item['Nome_Completo']
            const nome = item['nome'] || item['Nome'] || item['first_name'] || ''
            const sobrenome = item['sobrenome'] || item['Sobrenome'] || item['last_name'] || ''

            const name = nomeCompleto
              ? nomeCompleto
              : nome || sobrenome
                ? `${nome} ${sobrenome}`.trim()
                : 'Sem Nome'
            const email = (item['Email'] || item['email'] || '').trim()
            const rawPhone = item['Telefone'] || item['telefone'] || item['phone'] || ''
            const phone = formatPhone(rawPhone)
            const address = item['Endereço'] || item['endereco'] || item['address'] || ''
            const source = item['Lead Source'] || item['source'] || item['Origem'] || 'Zap/Viva'
            const orgName =
              item['Empresa'] ||
              item['empresa'] ||
              item['org_name'] ||
              item['Organization Name'] ||
              ''

            if (email && uniqueEmails.has(email)) return
            if (phone && uniquePhones.has(phone)) return

            if (email) uniqueEmails.add(email)
            if (phone) uniquePhones.add(phone)

            try {
              await createCustomer({
                name,
                email,
                email_1_value: email,
                phone,
                phone_1_value: phone,
                address_1_formatted: address,
                source,
                org_name: orgName,
                status: '1', // Lead Novo
                tags: ['Importado', source],
              })
              successCount++
            } catch (e) {
              console.error('Failed to create customer', e)
            }
          }),
        )
      }

      setProgress({
        current: parsedData.length,
        total: parsedData.length,
        message: 'Concluído!',
      })
      toast({ title: `${successCount} Leads importados com sucesso!` })
      onSuccess()

      setTimeout(() => {
        onOpenChange(false)
        setParsedData(null)
        setJsonInput('')
        setMode('append')
      }, 1000)
    } catch (err: any) {
      toast({
        title: 'Erro na importação',
        description: err.message || 'Erro de servidor.',
        variant: 'destructive',
      })
      setImporting(false)
    }
  }

  const resetData = () => {
    setParsedData(null)
    setJsonInput('')
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
          <DialogTitle>Importar Base de Leads</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou JSON, ou cole o conteúdo JSON abaixo para importar
            leads (Zap Imóveis, Viva Real, etc).
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
                    Adicionar (Manter base atual)
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
              <Label>Upload de Arquivo (CSV ou JSON)</Label>
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
                placeholder={`[\n  {\n    "Nome Completo": "João Silva",\n    "Email": "joao@example.com",\n    "Telefone": "11987654321",\n    "Endereço": "Rua A, 123",\n    "Lead Source": "Zap"\n  }\n]`}
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
        ) : (
          <div className="py-4 space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-muted/50 rounded-lg border border-dashed">
              <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
              <h3 className="font-semibold text-lg">{parsedData.length} registros prontos!</h3>
              <p className="text-sm text-muted-foreground text-center">
                O sistema identificou as colunas e processará as formatações necessárias.
              </p>

              {mode === 'replace' && (
                <p className="text-sm font-medium text-destructive mt-4 text-center">
                  ⚠️ Atenção: Todos os clientes atuais serão apagados antes da importação.
                </p>
              )}
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{Math.round((progress.current / progress.total) * 100) || 0}%</span>
                </div>
                <Progress value={(progress.current / progress.total) * 100} />
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

          {parsedData && (
            <Button
              variant={mode === 'replace' ? 'destructive' : 'default'}
              onClick={handleImport}
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
