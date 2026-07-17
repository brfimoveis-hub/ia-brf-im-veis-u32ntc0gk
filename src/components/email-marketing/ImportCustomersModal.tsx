import { useState, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { createCustomerWithRetry } from '@/services/customers'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, UploadCloud, CheckCircle2, FileText } from 'lucide-react'

const TARGET_FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Telefone' },
  { key: 'neighborhood', label: 'Bairro' },
  { key: 'lead_profile', label: 'Perfil do Lead' },
]

const PROFILE_VALUES = ['Investidor', 'Morador', 'Primeiro Imóvel', 'Veranista']

function parseCSV(str: string): Record<string, string>[] {
  const lines = str.split('\n').filter((l) => l.trim())
  if (lines.length === 0) return []
  const delim = lines[0].split(';').length > lines[0].split(',').length ? ';' : ','
  const result: string[][] = []
  let row: string[] = []
  let inQ = false
  let val = ''
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    if (ch === '"') {
      if (inQ && str[i + 1] === '"') {
        val += '"'
        i++
      } else {
        inQ = !inQ
      }
    } else if (ch === delim && !inQ) {
      row.push(val)
      val = ''
    } else if (ch === '\n' && !inQ) {
      row.push(val)
      result.push(row)
      row = []
      val = ''
    } else if (ch !== '\r' || !inQ) {
      val += ch
    }
  }
  row.push(val)
  if (row.length > 0 && (row[0] !== '' || row.length > 1)) result.push(row)
  if (result.length === 0) return []
  const headers = result[0].map((h) => (h || '').trim())
  const data: Record<string, string>[] = []
  for (let i = 1; i < result.length; i++) {
    if (result[i].length === 1 && result[i][0] === '') continue
    const obj: Record<string, string> = {}
    headers.forEach((h, j) => {
      if (h) obj[h] = (result[i][j] || '').trim()
    })
    data.push(obj)
  }
  return data
}

export function ImportCustomersModal({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const data = parseCSV(text)
    if (data.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhum dado válido encontrado no CSV.',
        variant: 'destructive',
      })
      return
    }
    const cols = Object.keys(data[0])
    setHeaders(cols)
    setRows(data)
    const auto: Record<string, string> = {}
    for (const tf of TARGET_FIELDS) {
      const match = cols.find(
        (c) => c.toLowerCase().includes(tf.key) || c.toLowerCase().includes(tf.label.toLowerCase()),
      )
      if (match) auto[tf.key] = match
    }
    setMapping(auto)
    toast({ title: 'Arquivo carregado', description: `${data.length} registros encontrados.` })
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleImport = async () => {
    if (!rows.length) return
    setImporting(true)
    setProgress(0)
    let success = 0
    let failed = 0
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const payload: Record<string, any> = {
        user_id: user?.id,
        status: 'Novo',
        source: 'Importação CSV',
      }
      for (const tf of TARGET_FIELDS) {
        const col = mapping[tf.key]
        if (col && row[col]) {
          if (tf.key === 'lead_profile') {
            const match = PROFILE_VALUES.find((p) => p.toLowerCase() === row[col].toLowerCase())
            if (match) payload[tf.key] = match
          } else {
            payload[tf.key] = row[col]
          }
        }
      }
      if (!payload.name && !payload.email && !payload.phone) {
        failed++
        continue
      }
      try {
        await createCustomerWithRetry(payload)
        success++
      } catch {
        failed++
      }
      setProgress(Math.round(((i + 1) / rows.length) * 100))
    }
    setImporting(false)
    toast({
      title: 'Importação concluída',
      description: `${success} importados, ${failed} falhas.`,
    })
    onSuccess()
    onOpenChange(false)
    setHeaders([])
    setRows([])
    setMapping({})
    setProgress(0)
  }

  const reset = () => {
    setHeaders([])
    setRows([])
    setMapping({})
    setProgress(0)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!importing) {
          onOpenChange(o)
          if (!o) reset()
        }
      }}
    >
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Importar Clientes (CSV)
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV e mapeie as colunas para os campos do cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
          {headers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4 border-2 border-dashed rounded-lg border-muted-foreground/20 bg-muted/10">
              <UploadCloud className="h-10 w-10 text-muted-foreground" />
              <input
                type="file"
                ref={fileRef}
                className="hidden"
                accept=".csv"
                onChange={handleFile}
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={importing}
              >
                Selecionar Arquivo CSV
              </Button>
              <p className="text-xs text-muted-foreground">Formatos aceitos: .csv</p>
            </div>
          ) : (
            <>
              {importing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Importando...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  {rows.length} registros detectados
                </div>
                <Label className="text-sm font-semibold">Mapeamento de Campos</Label>
                {TARGET_FIELDS.map((tf) => (
                  <div key={tf.key} className="flex items-center gap-3">
                    <Label className="w-32 text-xs text-muted-foreground shrink-0">
                      {tf.label}
                    </Label>
                    <Select
                      value={mapping[tf.key] || ''}
                      onValueChange={(v) => setMapping((p) => ({ ...p, [tf.key]: v }))}
                      disabled={importing}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Não mapear" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <DialogFooter className="p-6 pt-4 border-t bg-background">
          <Button
            variant="outline"
            onClick={() => {
              if (!importing) {
                onOpenChange(false)
                reset()
              }
            }}
            disabled={importing}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          {headers.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={importing || !rows.length}
              className="w-full sm:w-auto"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                'Confirmar Importação'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
