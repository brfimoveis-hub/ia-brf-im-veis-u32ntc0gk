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
          Preencha uma vez só. Os dados ficam salvos no seu navegador e alimentam automaticamente as
          cartas (incluindo a seção QUEM SOU). Os campos já vêm com os dados padrão do Mauro
          preenchidos e prontos para edição.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        {CAMPOS_CARTA.map((campo) => {
          const isFullWidth = campo.key === 'enderecoMauro' || campo.key === 'dataCarta'
          return (
            <div
              key={campo.key}
              className={isFullWidth ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}
            >
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor={`cartas-${campo.key}`} className="font-medium text-xs sm:text-sm">
                  {campo.label}
                </Label>
                {campo.helpText && (
                  <span className="text-[11px] text-muted-foreground hidden sm:inline">
                    {campo.helpText}
                  </span>
                )}
              </div>
              <Input
                id={`cartas-${campo.key}`}
                type={campo.type ?? 'text'}
                value={valores[campo.key] ?? ''}
                placeholder={campo.placeholder}
                onChange={(e) => onChange(campo.key, e.target.value)}
                autoComplete="off"
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
