import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import { getCustomer, updateCustomer, deleteCustomer, type Customer } from '@/services/customers'
import { getConversations, createConversation, type Conversation } from '@/services/conversations'
import { Send, User, Bot, CheckCircle2, Sparkles, Trash2, Ban, Save, BookOpen } from 'lucide-react'
import { cn, formatPhone } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import pb from '@/lib/pocketbase/client'

export function CustomerDetailDrawer({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [notes, setNotes] = useState('')
  const [isSavingNotes, setIsSavingNotes] = useState(false)
  const [currentCadence, setCurrentCadence] = useState<any | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (customer?.status && user?.id) {
      pb.collection('cadences')
        .getFirstListItem(
          `user_id = "${user.id}" && is_active = true && title = "${customer.status}"`,
        )
        .then((res) => setCurrentCadence(res))
        .catch(() => setCurrentCadence(null))
    }
  }, [customer?.status, user?.id])

  const loadData = () => {
    if (!customerId) return
    let mounted = true
    setLoading(true)
    setError(null)

    Promise.all([getCustomer(customerId), getConversations(customerId)])
      .then(([cust, convs]) => {
        if (mounted) {
          setCustomer(cust)
          setNotes(cust.notes || '')
          setConversations(convs)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (mounted) {
          setError('Erro ao carregar os detalhes do cliente ou histórico de conversas.')
          setLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }

  useEffect(() => {
    if (!open || !customerId) return
    return loadData()
  }, [customerId, open])

  useRealtime('customers', (e) => {
    if (!open || !customerId) return
    if (e.action === 'update' && e.record.id === customerId) {
      setCustomer(e.record as unknown as Customer)
      if (document.activeElement?.id !== 'customer-notes') {
        setNotes((e.record as any).notes || '')
      }
    }
  })

  useRealtime('conversations', (e) => {
    if (!open || !customerId) return
    if (e.record.customer_id === customerId) {
      if (e.action === 'create') {
        setConversations((prev) => {
          if (prev.some((c) => c.id === e.record.id)) return prev
          return [...prev, e.record as unknown as Conversation]
        })
      } else if (e.action === 'update') {
        setConversations((prev) =>
          prev.map((c) => (c.id === e.record.id ? (e.record as unknown as Conversation) : c)),
        )
      } else if (e.action === 'delete') {
        setConversations((prev) => prev.filter((c) => c.id !== e.record.id))
      }
    }
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversations])

  const handleToggleBlock = async (checked: boolean) => {
    if (!customer) return
    try {
      await updateCustomer(customer.id, { is_blocked: checked })
      toast({ title: checked ? 'Cliente bloqueado' : 'Cliente desbloqueado' })
    } catch (error) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  const handleSaveNotes = async () => {
    if (!customer) return
    setIsSavingNotes(true)
    try {
      await updateCustomer(customer.id, { notes })
      toast({ title: 'Anotações salvas' })
    } catch (error) {
      toast({ title: 'Erro ao salvar', variant: 'destructive' })
    } finally {
      setIsSavingNotes(false)
    }
  }

  const handleDelete = async () => {
    if (!customerId) return
    try {
      const msgs = await getConversations(customerId)
      for (const m of msgs) {
        await pb.collection('conversations').delete(m.id)
      }
      await deleteCustomer(customerId)
      toast({ title: 'Cliente excluído com sucesso' })
      onOpenChange(false)
    } catch (error) {
      toast({ title: 'Erro ao excluir cliente', variant: 'destructive' })
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputValue.trim() || !customerId) return
    const text = inputValue
    setInputValue('')
    try {
      await createConversation({
        customer_id: customerId,
        content: text,
        sender: 'agent',
      })
    } catch (error) {
      toast({ title: 'Erro ao enviar mensagem', variant: 'destructive' })
      setInputValue(text)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl flex flex-col p-0 bg-background/95 backdrop-blur-xl border-l shadow-2xl">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="bg-destructive/10 p-4 rounded-full">
              <Bot className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Erro ao carregar</h3>
              <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
            </div>
            <Button onClick={loadData} variant="outline" className="mt-4">
              Tentar Novamente
            </Button>
          </div>
        ) : !customer ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Cliente não encontrado.
          </div>
        ) : (
          <>
            <div className="p-6 border-b shrink-0 bg-card/50">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                    <AvatarImage
                      src={`https://img.usecurling.com/ppl/thumbnail?seed=${customer.id}`}
                    />
                    <AvatarFallback>{customer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-lg font-bold text-foreground leading-none mb-1">
                      {customer.name}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {customer.phone ? formatPhone(customer.phone) : customer.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="font-medium">
                        {customer.status || 'Lead Novo'}
                      </Badge>
                      {customer.is_blocked && (
                        <Badge variant="destructive" className="gap-1">
                          <Ban className="h-3 w-3" /> Bloqueado
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="block-toggle"
                      className="text-xs text-muted-foreground cursor-pointer"
                    >
                      Bloquear
                    </Label>
                    <Switch
                      id="block-toggle"
                      checked={!!customer.is_blocked}
                      onCheckedChange={handleToggleBlock}
                    />
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O cliente e todo o histórico de conversas
                          serão permanentemente removidos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-destructive hover:bg-destructive/90 text-white"
                        >
                          Excluir
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>

            <Tabs defaultValue="conversations" className="flex-1 flex flex-col overflow-hidden">
              <div className="px-6 pt-2 border-b bg-card/50 shrink-0">
                <TabsList className="w-full justify-start h-auto p-0 bg-transparent gap-6">
                  <TabsTrigger
                    value="conversations"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
                  >
                    Conversas
                  </TabsTrigger>
                  <TabsTrigger
                    value="details"
                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3"
                  >
                    Detalhes & Notas
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent
                value="details"
                className="flex-1 overflow-y-auto p-6 m-0 focus-visible:outline-none"
              >
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Telefone</span>
                      <p className="text-sm font-medium">{customer.phone || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <p className="text-sm font-medium">{customer.email || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Origem</span>
                      <p className="text-sm font-medium">{customer.source || '—'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground">Criado em</span>
                      <p className="text-sm font-medium">
                        {new Date(customer.created).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {customer.tags && customer.tags.length > 0 ? (
                        customer.tags.map((t, i) => (
                          <Badge key={i} variant="outline">
                            {t}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground">Nenhuma tag</span>
                      )}
                    </div>
                  </div>

                  {currentCadence && (
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" /> Playbook Sugerido (Fase:{' '}
                        {customer.status})
                      </Label>
                      <div className="bg-primary/5 p-4 rounded-lg border border-primary/10">
                        <p className="font-medium text-primary text-sm mb-2">Script/Mensagem:</p>
                        <p className="text-sm text-foreground italic">"{currentCadence.content}"</p>
                        {currentCadence.ai_instructions && (
                          <div className="mt-3 pt-3 border-t border-primary/10">
                            <p className="font-medium text-primary text-xs mb-1">Diretriz da IA:</p>
                            <p className="text-xs text-muted-foreground">
                              {currentCadence.ai_instructions}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="customer-notes">Notas Internas</Label>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={handleSaveNotes}
                        disabled={isSavingNotes}
                        className="h-7 text-xs"
                      >
                        {isSavingNotes ? (
                          'Salvando...'
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" /> Salvar
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      id="customer-notes"
                      placeholder="Adicione observações sobre o cliente..."
                      className="min-h-[150px] resize-none"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent
                value="conversations"
                className="flex-1 flex flex-col m-0 overflow-hidden focus-visible:outline-none"
              >
                <ScrollArea className="flex-1 p-4 relative bg-[#e5ddd5] dark:bg-[#0b141a]">
                  <div
                    className="absolute inset-0 opacity-[0.06] dark:opacity-[0.03] pointer-events-none"
                    style={{
                      backgroundImage:
                        'url("https://img.usecurling.com/p/800/600?q=texture&color=gray&dpr=1")',
                      backgroundSize: 'cover',
                    }}
                  ></div>
                  <div className="space-y-3 pb-4 relative z-10 flex-1 flex flex-col">
                    {conversations.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground py-12 text-center space-y-3">
                        <Bot className="h-12 w-12 opacity-20" />
                        <p>Nenhuma mensagem ainda.</p>
                      </div>
                    ) : (
                      conversations.map((msg) => {
                        const isSystem = msg.sender === 'system'
                        if (isSystem) {
                          return (
                            <div key={msg.id} className="flex justify-center my-4">
                              <div className="bg-primary/10 border border-primary/20 text-primary text-[11px] font-medium px-4 py-2 rounded-xl flex items-center gap-2 max-w-[80%] text-center shadow-sm">
                                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                <span className="leading-relaxed">{msg.content}</span>
                              </div>
                            </div>
                          )
                        }
                        const isClient = msg.sender === 'customer'
                        return (
                          <div
                            key={msg.id}
                            className={cn('flex', isClient ? 'justify-start' : 'justify-end')}
                          >
                            <div
                              className={cn(
                                'max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm relative',
                                isClient
                                  ? 'bg-card text-foreground rounded-tl-sm'
                                  : 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-tr-sm',
                              )}
                            >
                              {!isClient && msg.sender === 'ai' && (
                                <div className="flex items-center gap-1.5 mb-1.5 opacity-80">
                                  <img
                                    src={
                                      user?.ai_avatar
                                        ? pb.files.getURL(user, user.ai_avatar)
                                        : 'https://img.usecurling.com/p/256/256?q=elegant%20young%20woman%20smiling'
                                    }
                                    alt="AI"
                                    className="h-4 w-4 rounded-full object-cover shadow-sm border border-primary/10"
                                  />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-green-400">
                                    {user?.ai_name || 'Bia Elegante'}
                                  </span>
                                </div>
                              )}
                              {!isClient && (msg.sender === 'agent' || msg.sender === 'user') && (
                                <div className="flex items-center gap-1 mb-1 opacity-70">
                                  <User className="h-3 w-3 text-amber-600" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                                    Humano
                                  </span>
                                </div>
                              )}
                              <p className="text-[14px] leading-relaxed whitespace-pre-wrap">
                                {msg.content}
                              </p>
                              <div className="flex items-center justify-end gap-1 mt-1 -mb-1">
                                <span className="text-[10px] text-muted-foreground opacity-80">
                                  {new Date(msg.created).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {!isClient && (
                                  <CheckCircle2 className="h-3 w-3 text-primary/80 dark:text-green-400" />
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>
                <div className="p-3 bg-card border-t shrink-0">
                  {customer.is_blocked ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
                      <Ban className="h-4 w-4" /> Cliente bloqueado. Desbloqueie para enviar
                      mensagens.
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                      <Input
                        placeholder="Digite sua mensagem..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="bg-muted/50 border-none rounded-2xl px-4 py-2 h-auto min-h-[44px]"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        disabled={!inputValue.trim()}
                        className="h-11 w-11 rounded-full shrink-0"
                      >
                        <Send className="h-4 w-4 ml-1" />
                      </Button>
                    </form>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
