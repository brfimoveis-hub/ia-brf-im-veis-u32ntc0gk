import { useState, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { bulkDeleteCustomers, createCustomerWithRetry } from '@/services/customers'
import pb from '@/lib/pocketbase/client'

const GENERIC_MAPPING: Record<string, string[]> = {
  name: [
    'name',
    'nome',
    'first name',
    'given name',
    'full name',
    'razao social',
    'cliente',
    'first_name',
    'contact name',
    'display name',
  ],
  phone: [
    'phone',
    'telefone',
    'mobile',
    'celular',
    'whatsapp',
    'cel',
    'tel',
    'phone 1 - value',
    'phone_1_value',
  ],
  email: ['email', 'e-mail', 'e-mail 1 - value', 'mail', 'correio eletrônico', 'email_1_value'],
}

const normalizeHeader = (h: string) => h.trim().toLowerCase().replace(/^"|"$/g, '')

function parseCSV(text: string): string[][] {
  const result: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(current)
      current = ''
    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !inQuotes) {
      if (char === '\r') i++
      row.push(current)
      result.push(row)
      row = []
      current = ''
    } else {
      current += char
    }
  }

  if (current || row.length > 0) {
    row.push(current)
    if (row.length > 0 || current !== '') {
      result.push(row)
    }
  }

  return result
}

export function CsvImportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSuccess: () => void
}) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const [replaceData, setReplaceData] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [internalImporting, setInternalImporting] = useState(false)
  const [internalProgress, setInternalProgress] = useState({ current: 0, total: 0 })
  const [internalDeleting, setInternalDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [failedRecords, setFailedRecords] = useState<any[]>([])

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isBusy = internalImporting || internalDeleting
  const displayProgress = internalDeleting ? deleteProgress : internalProgress

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    try {
      const text = await selected.text()
      const rows = parseCSV(text)

      const headers = rows[0] || []
      const newMapping: Record<string, number> = {}

      let mappedNameIndex = -1
      let mappedPhoneIndex = -1
      let mappedEmailIndex = -1

      headers.forEach((header, index) => {
        const cleanHeader = normalizeHeader(header)
        if (mappedNameIndex === -1 && GENERIC_MAPPING.name.includes(cleanHeader))
          mappedNameIndex = index
        if (mappedPhoneIndex === -1 && GENERIC_MAPPING.phone.includes(cleanHeader))
          mappedPhoneIndex = index
        if (mappedEmailIndex === -1 && GENERIC_MAPPING.email.includes(cleanHeader))
          mappedEmailIndex = index
      })

      if (mappedNameIndex !== -1) newMapping['Nome'] = mappedNameIndex
      if (mappedPhoneIndex !== -1) newMapping['Telefone'] = mappedPhoneIndex
      if (mappedEmailIndex !== -1) newMapping['Email'] = mappedEmailIndex

      if (mappedNameIndex === -1 && mappedPhoneIndex === -1) {
        toast({
          title: 'Erro de validação',
          description: 'Não foi possível encontrar as colunas de Nome ou Telefone.',
          variant: 'destructive',
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setFile(selected)
      setData(rows)
      setMapping(newMapping)
      setFailedRecords([])
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Verifique se o arquivo está no formato CSV válido com codificação UTF-8.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImportClick = () => {
    if (replaceData) {
      setShowConfirm(true)
    } else {
      executeImport()
    }
  }

  const executeImport = async (recordsToProcess?: any[]) => {
    setShowConfirm(false)

    let targetData = recordsToProcess
    if (!targetData) {
      if (!data.length) return
      const rows = data.slice(1)
      targetData = rows
        .map((row) => {
          const nameIndex = mapping['Nome']
          const phoneIndex = mapping['Telefone']
          const emailIndex = mapping['Email']

          const rawName = nameIndex !== undefined ? row[nameIndex]?.trim() : ''
          const phone = phoneIndex !== undefined ? row[phoneIndex]?.trim() : ''
          const email = emailIndex !== undefined ? row[emailIndex]?.trim() : ''

          const name = rawName || ''

          let first_name = ''
          let last_name = ''

          if (name) {
            const parts = name.split(/\s+/)
            first_name = parts[0] || ''
            last_name = parts.slice(1).join(' ') || ''
          }

          return {
            name,
            first_name,
            last_name,
            phone,
            email,
            phone_1_value: phone,
            email_1_value: email,
          }
        })
        .filter((obj) => obj.name && obj.name.trim() !== '') // Only keep valid records with name
    }

    if (!targetData || targetData.length === 0) return

    if (replaceData && !recordsToProcess) {
      setInternalDeleting(true)
      try {
        const allCustomers = await pb.collection('customers').getFullList({ fields: 'id' })
        const totalToDelete = allCustomers.length
        setDeleteProgress({ current: 0, total: totalToDelete })

        if (totalToDelete > 0) {
          const deleteBatchSize = 500
          for (let i = 0; i < totalToDelete; i += deleteBatchSize) {
            const batch = allCustomers.slice(i, i + deleteBatchSize).map((c) => c.id)
            await bulkDeleteCustomers(batch)
            setDeleteProgress({
              current: Math.min(i + batch.length, totalToDelete),
              total: totalToDelete,
            })
            await new Promise((r) => setTimeout(r, 100)) // 100ms delay to prevent rate-limiting
          }
        }
      } catch (error) {
        toast({
          title: 'Erro na exclusão',
          description: 'Erro ao limpar a base. A importação foi interrompida.',
          variant: 'destructive',
        })
        setInternalDeleting(false)
        return
      }
      setInternalDeleting(false)
    }

    setInternalImporting(true)
    setInternalProgress({ current: 0, total: targetData.length })

    let successCount = 0
    let newFailed: any[] = []
    const insertBatchSize = 50 // Increased for faster import while avoiding timeouts

    for (let i = 0; i < targetData.length; i += insertBatchSize) {
      const batch = targetData.slice(i, i + insertBatchSize)
      setInternalProgress({ current: i, total: targetData.length })

      const results = await Promise.allSettled(
        batch.map(async (item) => {
          const customerData = {
            ...item,
            status: item.status || '1',
            tags: item.tags || ['Importado', 'CSV'],
          }
          await createCustomerWithRetry(customerData)
        }),
      )

      results.forEach((res, idx) => {
        if (res.status === 'rejected') {
          newFailed.push(batch[idx])
        } else {
          successCount++
        }
      })

      setInternalProgress({
        current: Math.min(i + batch.length, targetData.length),
        total: targetData.length,
      })
      await new Promise((r) => setTimeout(r, 100)) // 100ms strategic delay to respect rate limits
    }

    if (successCount > 0) {
      onSuccess()
    }

    if (newFailed.length > 0) {
      setFailedRecords(newFailed)
      toast({
        title: 'Importação parcial',
        description: `${successCount} contatos importados. ${newFailed.length} falharam.`,
        variant: 'destructive',
      })
    } else {
      toast({ title: `Todos os contatos foram importados com sucesso!` })
      reset()
      onOpenChange(false)
    }

    setInternalImporting(false)
  }

  const reset = () => {
    setFile(null)
    setData([])
    setMapping({})
    setReplaceData(false)
    setShowConfirm(false)
    setInternalDeleting(false)
    setFailedRecords([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (isBusy) return
          onOpenChange(val)
          if (!val) reset()
        }}
      >
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>Importar Contatos (CSV)</DialogTitle>
            <DialogDescription>
              Faça upload do seu arquivo CSV. O mapeamento de Nome, Email e Telefone será feito
              automaticamente.
            </DialogDescription>
          </DialogHeader>

          {failedRecords.length > 0 ? (
            <div className="py-4 space-y-6">
              <div className="flex flex-col items-center justify-center p-6 bg-destructive/10 rounded-lg border border-destructive/20">
                <AlertTriangle className="h-10 w-10 text-destructive mb-2" />
                <h3 className="font-semibold text-lg">{failedRecords.length} registros falharam</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Alguns registros falharam na importação. Isso pode ocorrer devido a instabilidades
                  de rede temporárias.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => executeImport(failedRecords)}
                  disabled={isBusy}
                >
                  {internalImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Tentar Novamente Falhas
                </Button>
              </div>
            </div>
          ) : !file ? (
            <div
              className="border-2 border-dashed rounded-lg p-8 sm:p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">Clique para selecionar um arquivo .csv</p>
              <input
                type="file"
                accept=".csv"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFile}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <Alert className="bg-primary/5 border-primary/20">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="text-primary font-medium">
                  {Object.keys(mapping).length} colunas mapeadas automaticamente:{' '}
                  {Object.keys(mapping).join(', ')}.
                  {data.length > 1 && ` ${data.length - 1} contatos encontrados.`}
                </AlertDescription>
              </Alert>

              <div className="border rounded-md overflow-x-auto max-h-[40vh]">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground sticky top-0">
                    <tr>
                      {Object.keys(mapping).map((targetKey, i) => (
                        <th key={i} className="px-4 py-2 font-medium whitespace-nowrap border-b">
                          {targetKey}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.slice(1, 10).map((row, i) => (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/30">
                        {Object.values(mapping).map((colIndex, j) => (
                          <td
                            key={j}
                            className="px-4 py-2 whitespace-nowrap truncate max-w-[200px]"
                          >
                            {row[colIndex] || <span className="text-muted-foreground/40">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 10 && (
                  <div className="text-center p-3 text-xs text-muted-foreground border-t bg-muted/20 sticky bottom-0">
                    Mostrando 9 de {data.length - 1} contatos
                  </div>
                )}
              </div>
            </div>
          )}

          {file && failedRecords.length === 0 && (
            <div className="space-y-4 py-4 border-t mt-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="replace-data"
                  checked={replaceData}
                  onCheckedChange={setReplaceData}
                  disabled={isBusy}
                />
                <Label htmlFor="replace-data" className="cursor-pointer">
                  Apagar todos os clientes atuais antes da importação
                </Label>
              </div>

              {replaceData && (
                <Alert variant="destructive" className="bg-destructive/10">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="font-semibold">
                    ⚠️ Atenção: Todos os clientes atuais serão apagados permanentemente antes da
                    importação.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {isBusy && (
            <div className="space-y-2 py-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-1">
                <span>
                  {internalDeleting
                    ? displayProgress.total === 0 && displayProgress.current === 0
                      ? 'Iniciando limpeza da base...'
                      : `Limpando: ${displayProgress.current}/${displayProgress.total}`
                    : `Importando: ${displayProgress.current}/${displayProgress.total}`}
                </span>
                {displayProgress.total > 0 && (
                  <span>
                    {Math.round((displayProgress.current / displayProgress.total) * 100)}%
                  </span>
                )}
              </div>
              {displayProgress.total > 0 ? (
                <Progress
                  value={(displayProgress.current / displayProgress.total) * 100}
                  className="h-2"
                />
              ) : (
                <div className="h-2 w-full bg-muted overflow-hidden rounded-full">
                  <div className="h-full bg-primary w-1/2 animate-pulse rounded-full" />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isBusy}>
              Cancelar
            </Button>
            {failedRecords.length === 0 && (
              <Button
                onClick={handleImportClick}
                disabled={!file || data.length < 2 || isBusy}
                variant={replaceData ? 'destructive' : 'default'}
              >
                {isBusy
                  ? 'Processando...'
                  : replaceData
                    ? 'Substituir Base'
                    : 'Confirmar Importação'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar substituição</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apagará permanentemente todos os clientes atuais da sua base. Você tem
              certeza que deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={internalDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                executeImport()
              }}
              disabled={internalDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, substituir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
