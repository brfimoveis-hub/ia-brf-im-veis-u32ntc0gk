import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import { useRealtime } from '@/hooks/use-realtime'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Bot, Clock, User, Activity } from 'lucide-react'
import pb from '@/lib/pocketbase/client'

interface ActivityItem {
  id: string
  customerId: string
  customerName: string
  status: string
  updatedAt: Date
  isAiInteraction: boolean
}

export function RecentPerformance() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const customersRes = await pb.collection('customers').getList(1, 15, { sort: '-updated' })
      const convsRes = await pb
        .collection('conversations')
        .getList(1, 20, { sort: '-created', expand: 'customer_id' })

      const activityMap = new Map<string, ActivityItem>()

      customersRes.items.forEach((c: any) => {
        activityMap.set(c.id, {
          id: c.id,
          customerId: c.id,
          customerName: c.name,
          status: c.status,
          updatedAt: new Date(c.updated),
          isAiInteraction: false,
        })
      })

      convsRes.items.forEach((conv: any) => {
        const cust = conv.expand?.customer_id
        if (!cust) return
        const convDate = new Date(conv.created)
        const existing = activityMap.get(cust.id)

        if (!existing || convDate > existing.updatedAt) {
          activityMap.set(cust.id, {
            id: cust.id,
            customerId: cust.id,
            customerName: cust.name,
            status: cust.status,
            updatedAt: convDate,
            isAiInteraction: conv.sender === 'ai',
          })
        }
      })

      const merged = Array.from(activityMap.values())
        .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
        .slice(0, 15)

      setActivities(merged)
    } catch (error) {
      console.error('Failed to load recent performance:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('customers', () => {
    loadData()
  })

  useRealtime('conversations', () => {
    loadData()
  })

  if (loading) {
    return (
      <div className="w-full h-32 flex items-center justify-center border rounded-xl bg-muted/10">
        <Activity className="h-6 w-6 text-muted-foreground animate-pulse" />
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="w-full p-8 flex flex-col items-center justify-center border rounded-xl bg-muted/10 text-center space-y-3">
        <div className="p-3 bg-muted rounded-full">
          <Clock className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground font-medium">Nenhuma atividade recente detectada.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full px-12">
      <Carousel
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4 py-2">
          {activities.map((activity) => (
            <CarouselItem key={activity.customerId} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 h-full bg-card/50 backdrop-blur-sm">
                <CardContent className="p-5 flex flex-col h-full gap-4">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="p-2 bg-primary/10 rounded-full shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <span
                        className="font-semibold text-sm truncate"
                        title={activity.customerName}
                      >
                        {activity.customerName}
                      </span>
                    </div>
                    {activity.isAiInteraction && (
                      <div className="flex items-center gap-1 text-[10px] font-medium text-purple-600 bg-purple-500/10 px-2 py-1 rounded-full shrink-0 shadow-sm border border-purple-500/20">
                        <Bot className="h-3 w-3" />
                        IA
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">Status</span>
                      <Badge
                        variant="outline"
                        className="text-xs font-medium bg-background/50 truncate max-w-[120px]"
                      >
                        {activity.status || 'Novo'}
                      </Badge>
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground gap-1.5 border-t pt-3">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <span className="truncate">
                        {formatDistanceToNow(activity.updatedAt, { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="-left-4 lg:-left-10 h-8 w-8 bg-background/80 backdrop-blur border-muted shadow-sm hover:bg-background hover:scale-105 transition-all" />
        <CarouselNext className="-right-4 lg:-right-10 h-8 w-8 bg-background/80 backdrop-blur border-muted shadow-sm hover:bg-background hover:scale-105 transition-all" />
      </Carousel>
    </div>
  )
}
