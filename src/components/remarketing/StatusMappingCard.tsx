import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Save, Loader2 } from 'lucide-react'
import { CUSTOMER_STATUSES, type RemarketingPreferences } from '@/services/remarketing'

interface StatusMappingCardProps {
  preferences: RemarketingPreferences
  onChange: (prefs: RemarketingPreferences) => void
  onSave: () => void
  saving: boolean
}

export function StatusMappingCard({
  preferences,
  onChange,
  onSave,
  saving,
}: StatusMappingCardProps) {
  const toggleStatus = (status: string) => {
    const enabled = preferences.enabledStatuses.includes(status)
    onChange({
      ...preferences,
      enabledStatuses: enabled
        ? preferences.enabledStatuses.filter((s) => s !== status)
        : [...preferences.enabledStatuses, status],
    })
  }

  const setAudience = (status: string, audience: string) => {
    onChange({
      ...preferences,
      audienceMappings: { ...preferences.audienceMappings, [status]: audience },
    })
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Mapeamento de Status</CardTitle>
            <CardDescription>
              Selecione quais status disparam a sincronização com Meta.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-sync" className="text-sm text-muted-foreground">
              Sync Automático
            </Label>
            <Switch
              id="auto-sync"
              checked={preferences.autoSync}
              onCheckedChange={(v) => onChange({ ...preferences, autoSync: v })}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-1">
            {CUSTOMER_STATUSES.map((status) => {
              const isEnabled = preferences.enabledStatuses.includes(status)
              return (
                <div
                  key={status}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <Checkbox
                    checked={isEnabled}
                    onCheckedChange={() => toggleStatus(status)}
                    id={`status-${status}`}
                  />
                  <Label
                    htmlFor={`status-${status}`}
                    className="flex-1 cursor-pointer text-sm font-medium"
                  >
                    {status}
                  </Label>
                  {isEnabled && (
                    <Input
                      placeholder="Audiência"
                      value={preferences.audienceMappings[status] || ''}
                      onChange={(e) => setAudience(status, e.target.value)}
                      className="max-w-[180px] h-8 text-sm"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {preferences.enabledStatuses.length} status selecionados
          </p>
          <Button onClick={onSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar Preferências
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
