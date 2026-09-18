import pb from '@/lib/pocketbase/client'

export interface Conversation {
  id: string
  customer_id: string
  user_id?: string
  content: string
  sender: 'customer' | 'agent' | 'ai' | 'system'
  channel?: 'whatsapp' | 'messenger' | 'instagram'
  created: string
  updated: string
  expand?: {
    customer_id?: {
      id: string
      name: string
      phone: string
      email?: string
      status?: string
      source?: string
      phase?: string
      is_blocked?: boolean
    }
  }
}

export interface InboxThread {
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_status?: string
  last_message: string
  last_message_time: string
  channel: string
  sender: string
  unread_or_active?: boolean
}

export const getConversations = (customerId: string) =>
  pb.collection('conversations').getFullList<Conversation>({
    filter: `customer_id = "${customerId}"`,
    sort: 'created',
    expand: 'customer_id',
  })

export const createConversation = (data: Partial<Conversation>) =>
  pb.collection('conversations').create<Conversation>(data)

export const getInboxThreads = async (userId?: string): Promise<InboxThread[]> => {
  const currentUserId = userId || pb.authStore.record?.id
  const filter = currentUserId ? `user_id = "${currentUserId}"` : ''

  const records = await pb.collection('conversations').getList<Conversation>(1, 500, {
    ...(filter ? { filter } : {}),
    sort: '-created',
    expand: 'customer_id',
  })

  const grouped = new Map<string, Conversation>()
  for (const conv of records.items) {
    if (conv.customer_id && !grouped.has(conv.customer_id)) {
      grouped.set(conv.customer_id, conv)
    }
  }

  return Array.from(grouped.values()).map((conv) => ({
    customer_id: conv.customer_id,
    customer_name: conv.expand?.customer_id?.name || 'Sem nome',
    customer_phone: conv.expand?.customer_id?.phone || '',
    customer_status: conv.expand?.customer_id?.status || '',
    last_message: conv.content,
    last_message_time: conv.created,
    channel: conv.channel || 'whatsapp',
    sender: conv.sender,
  }))
}

export const sendManualReply = async (customerId: string, content: string, channel?: string) =>
  pb.collection('conversations').create<Conversation>({
    customer_id: customerId,
    user_id: pb.authStore.record?.id,
    sender: 'agent',
    content,
    channel: channel || 'whatsapp',
  })
