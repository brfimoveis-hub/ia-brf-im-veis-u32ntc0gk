import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, User, UserCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function ActivityMonitor({ conversations }: { conversations: any[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Monitor de Atividades ao Vivo</CardTitle>
        <CardDescription>Interações recentes do seu funil.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-6">
          {conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma atividade recente.
            </p>
          ) : (
            conversations.map((conv) => {
              const isAi = conv.sender === 'ai' || conv.sender === 'system'
              const isAgent = conv.sender === 'agent'
              const customerName =
                conv.expand?.customer_id?.name ||
                conv.expand?.customer_id?.first_name ||
                'Desconhecido'

              return (
                <div key={conv.id} className="flex items-start gap-4">
                  <div className="mt-1 flex-shrink-0">
                    {isAi ? (
                      <Bot className="h-5 w-5 text-primary" />
                    ) : isAgent ? (
                      <UserCircle className="h-5 w-5 text-blue-500" />
                    ) : (
                      <User className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className="text-sm font-medium leading-none">
                      {isAi ? 'Assistente IA' : isAgent ? 'Agente' : customerName}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">{conv.content}</p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(conv.created), { addSuffix: true, locale: ptBR })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
