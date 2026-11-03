import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CAMPOS_CARTA, type CampoCarta, type CamposValores } from '@/data/cartas-meta-content'

type Props = {
  valores: CamposValores
  onChange: (key: CampoCarta, value: string) => void
}

export function CartasMetaForm({ valores, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dados para preencher as cartas</CardTitle>
        <CardDescription>
          Preencha uma vez só. Os dados ficam salvos neste navegador e entram em todas as cartas.
          Campos vazios aparecem como [texto] destacado em cinza.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {CAMPOS_CARTA.map((campo) => (
          <div key={campo.key} className="space-y-1.5">
            <Label htmlFor={`cartas-${campo.key}`}>{campo.label}</Label>
            <Input
              id={`cartas-${campo.key}`}
              type={campo.type ?? 'text'}
              value={valores[campo.key]}
              placeholder={campo.placeholder}
              onChange={(e) => onChange(campo.key, e.target.value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
