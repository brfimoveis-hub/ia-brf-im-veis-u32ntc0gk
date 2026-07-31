import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import type { Cadence } from '@/services/cadences'

interface CadenceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cadence: Cadence | null
  cadenceCount: number
  onSave: (data: Partial<Cadence>, editingId: string | null) => Promise<void>
}

export function CadenceFormDialog({
  open,
  onOpenChange,
  cadence,
  cadenceCount,
  onSave,
}: CadenceFormDialogProps) {
  const [formData, setFormData] = useState<Partial<Cadence>>({
    title: '',
    description: '',
    content: '',
    ai_instructions: '',
    order: 1,
    is_active: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (cadence) {
      setFormData(cadence)
    } else {
      setFormData({
        title: '',
        description: '',
        content: '',
        ai_instructions: '',
        order: cadenceCount + 1,
        is_active: true,
      })
    }
  }, [open, cadence, cadenceCount])

  const handleSave = async () => {
    if (!formData.title || !formData.content) return
    setSaving(true)
    try {
      await onSave(formData, cadence?.id ?? null)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{cadence ? 'Editar Passo' : 'Novo Passo de Cadência'}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
          <div className="space-y-4 p-1">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3 space-y-2">
                <Label>Título (Nome da Fase/Status)</Label>
                <Input
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Contato 1, Qualificação..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.order || 1}
                  onChange={(e) =>
                    setFormData({ ...formData, order: parseInt(e.target.value) || 1 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição Interna</Label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Primeira tentativa de contato após cadastro"
              />
            </div>
            <div className="space-y-2">
              <Label>Conteúdo Base (O que a IA deve falar/vender)</Label>
              <Textarea
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Escreva o script principal desta fase..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Diretrizes Específicas para IA (Como a IA deve se comportar)</Label>
              <Textarea
                value={formData.ai_instructions || ''}
                onChange={(e) => setFormData({ ...formData, ai_instructions: e.target.value })}
                placeholder="Ex: Seja mais insistente, ofereça um agendamento. Se o cliente disser X, avance para [STATUS: Qualificação]."
                className="min-h-[100px]"
              />
            </div>
            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-md">
              <div>
                <Label className="font-semibold text-base">Passo Ativo</Label>
                <p className="text-xs text-muted-foreground">
                  A IA utilizará esta fase no fluxo automático.
                </p>
              </div>
              <Switch
                checked={formData.is_active ?? true}
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
              />
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !formData.title || !formData.content}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
