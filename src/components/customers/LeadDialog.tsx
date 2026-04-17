import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LeadDialog({
  open,
  onOpenChange,
  onSave,
  defaultValues,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onSave: (data: any) => void
  defaultValues?: any
}) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  })

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        setFormData({
          name: defaultValues.name || '',
          phone: defaultValues.phone || '',
          email: defaultValues.email || '',
        })
      } else {
        setFormData({ name: '', phone: '', email: '' })
      }
    }
  }, [defaultValues, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id: defaultValues?.id || `lead-${Date.now()}`,
      ...formData,
      phaseId: defaultValues?.phaseId || 1,
      tags: defaultValues?.tags || ['Manual'],
      lastInteraction: defaultValues?.lastInteraction || 'Agora',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{defaultValues ? 'Editar Lead' : 'Adicionar Lead'}</DialogTitle>
          <DialogDescription>
            {defaultValues
              ? 'Atualize as informações do cliente.'
              : 'Preencha as informações do novo cliente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: João da Silva"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ex: +55 11 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Ex: joao@email.com"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
