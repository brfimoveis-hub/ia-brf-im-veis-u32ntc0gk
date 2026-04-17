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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Upload } from 'lucide-react'

export function CsvImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onImport: (data: any[]) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [data, setData] = useState<string[][]>([])
  const [mapping, setMapping] = useState<Record<string, number>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    setFile(selected)
    const text = await selected.text()
    const rows = text
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')))
    setData(rows)
    setMapping({})
  }

  const handleImport = () => {
    if (!data.length) return
    const rows = data.slice(1)

    const mappedData = rows.map((row) => ({
      name: mapping.name !== undefined ? row[mapping.name] : 'Desconhecido',
      phone: mapping.phone !== undefined ? row[mapping.phone] : '',
      email: mapping.email !== undefined ? row[mapping.email] : '',
    }))

    onImport(mappedData)
    onOpenChange(false)
    setFile(null)
    setData([])
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        onOpenChange(val)
        if (!val) {
          setFile(null)
          setData([])
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }}
    >
      <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>Importar CSV</DialogTitle>
          <DialogDescription>
            Faça upload do seu arquivo CSV e mapeie as colunas para importar os leads.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div
            className="border-2 border-dashed rounded-lg p-8 sm:p-12 text-center hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">Clique para selecionar um arquivo .csv</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {['name', 'phone', 'email'].map((field) => (
                <div key={field} className="space-y-2">
                  <label className="text-sm font-medium capitalize">
                    {field === 'name' ? 'Nome' : field === 'phone' ? 'Telefone' : 'Email'}
                  </label>
                  <Select
                    onValueChange={(val) =>
                      setMapping((prev) => ({ ...prev, [field]: parseInt(val) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      {data[0]?.map((col, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <div className="border rounded-md overflow-x-auto max-h-[30vh]">
              <table className="w-full text-sm text-left">
                <thead className="bg-muted text-muted-foreground sticky top-0">
                  <tr>
                    {data[0]?.map((col, i) => (
                      <th key={i} className="px-4 py-2 font-medium whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(1, 4).map((row, i) => (
                    <tr key={i} className="border-t">
                      {row.map((cell, j) => (
                        <td key={j} className="px-4 py-2 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 4 && (
                <div className="text-center p-2 text-xs text-muted-foreground border-t bg-muted/20">
                  Mostrando 3 de {data.length - 1} linhas
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!file}>
            Importar Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
