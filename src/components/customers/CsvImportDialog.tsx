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
import { Upload, CheckCircle2 } from 'lucide-react'

const GOOGLE_CONTACTS_MAPPING: Record<string, string> = {
  'First Name': 'first_name',
  'Given Name': 'first_name',
  'Middle Name': 'middle_name',
  'Additional Name': 'middle_name',
  'Last Name': 'last_name',
  'Family Name': 'last_name',
  'Phonetic First Name': 'phonetic_first_name',
  'Phonetic Middle Name': 'phonetic_middle_name',
  'Phonetic Last Name': 'phonetic_last_name',
  'Name Prefix': 'name_prefix',
  'Name Suffix': 'name_suffix',
  Nickname: 'nickname',
  'File As': 'file_as',
  'Organization Name': 'org_name',
  'Organization Title': 'org_title',
  'Organization Department': 'org_dept',
  Birthday: 'birthday',
  Notes: 'notes',
  Photo: 'photo',
  Labels: 'tags',
  'Group Membership': 'tags',
  'E-mail 1 - Label': 'email_1_label',
  'E-mail 1 - Type': 'email_1_label',
  'E-mail 1 - Value': 'email_1_value',
  'E-mail 2 - Label': 'email_2_label',
  'E-mail 2 - Type': 'email_2_label',
  'E-mail 2 - Value': 'email_2_value',
  'Phone 1 - Label': 'phone_1_label',
  'Phone 1 - Type': 'phone_1_label',
  'Phone 1 - Value': 'phone_1_value',
  'Phone 2 - Label': 'phone_2_label',
  'Phone 2 - Type': 'phone_2_label',
  'Phone 2 - Value': 'phone_2_value',
  'Phone 3 - Label': 'phone_3_label',
  'Phone 3 - Type': 'phone_3_label',
  'Phone 3 - Value': 'phone_3_value',
  'Phone 4 - Label': 'phone_4_label',
  'Phone 4 - Type': 'phone_4_label',
  'Phone 4 - Value': 'phone_4_value',
  'Address 1 - Label': 'address_1_label',
  'Address 1 - Type': 'address_1_label',
  'Address 1 - Formatted': 'address_1_formatted',
  'Address 1 - Street': 'address_1_street',
  'Address 1 - City': 'address_1_city',
  'Address 1 - PO Box': 'address_1_po_box',
  'Address 1 - Region': 'address_1_region',
  'Address 1 - Postal Code': 'address_1_postal_code',
  'Address 1 - Country': 'address_1_country',
  'Address 1 - Extended Address': 'address_1_extended',
  'Website 1 - Label': 'website_1_label',
  'Website 1 - Type': 'website_1_label',
  'Website 1 - Value': 'website_1_value',
}

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
  onImport,
  isImporting,
  progress,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onImport: (data: any[]) => Promise<void>
  isImporting?: boolean
  progress?: { current: number; total: number }
}) {
  const { toast } = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    try {
      const text = await selected.text()
      const rows = parseCSV(text)

      const headers = rows[0] || []
      const newMapping: Record<string, number> = {}
      headers.forEach((header, index) => {
        const cleanHeader = header.trim().replace(/^"|"$/g, '')
        if (GOOGLE_CONTACTS_MAPPING[cleanHeader]) {
          newMapping[GOOGLE_CONTACTS_MAPPING[cleanHeader]] = index
        }
      })

      if (Object.keys(newMapping).length === 0) {
        toast({
          title: 'Arquivo inválido',
          description:
            'Nenhum cabeçalho compatível com o Google Contacts foi encontrado no arquivo CSV.',
          variant: 'destructive',
        })
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setFile(selected)
      setData(rows)
      setMapping(newMapping)
    } catch (error) {
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Verifique se o arquivo está no formato CSV válido com codificação UTF-8.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImport = async () => {
    if (!data.length) return
    const rows = data.slice(1)

    const mappedData = rows
      .map((row) => {
        const obj: any = {}
        Object.entries(mapping).forEach(([targetKey, colIndex]) => {
          if (row[colIndex]) {
            obj[targetKey] = row[colIndex].trim()
          }
        })
        return obj
      })
      .filter((obj) => Object.keys(obj).length > 0 && Object.values(obj).some((v) => v !== ''))

    await onImport(mappedData)
    reset()
  }

  const reset = () => {
    setFile(null)
    setData([])
    setMapping({})
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (isImporting) return
        onOpenChange(val)
        if (!val) reset()
      }}
    >
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Importar Google Contacts (CSV)</DialogTitle>
          <DialogDescription>
            Faça upload do seu arquivo CSV exportado do Google Contacts. O mapeamento dos campos
            será feito automaticamente.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 sm:p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm font-medium">Clique para selecionar um arquivo .csv</p>
            <p className="text-xs text-muted-foreground mt-1">
              Exportado diretamente do Google Contacts
            </p>
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
                {Object.keys(mapping).length} colunas mapeadas automaticamente.
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
                        <td key={j} className="px-4 py-2 whitespace-nowrap truncate max-w-[200px]">
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

        {isImporting && progress && (
          <div className="space-y-2 py-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Importando contatos...</span>
              <span>
                {progress.current} / {progress.total}
              </span>
            </div>
            <Progress
              value={progress.total > 0 ? (progress.current / progress.total) * 100 : 0}
              className="h-2"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file || data.length < 2 || isImporting}>
            {isImporting ? 'Importando...' : 'Importar Contatos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
