import { SettingsCadences } from './settings/SettingsCadences'

export default function Cadences() {
  return (
    <div className="max-w-6xl mx-auto pb-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">Gestão de Cadências</h2>
        <p className="text-muted-foreground">
          Configure as réguas de relacionamento, golden cadences (D0-D9) e diretrizes de IA.
        </p>
      </div>
      <SettingsCadences />
    </div>
  )
}
