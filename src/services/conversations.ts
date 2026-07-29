import pb from '@/lib/pocketbase/client'

export interface Conversation {
  id: string
  customer_id: string
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
      source: string
      is_blocked: boolean
    }
  }
}

export interface InboxThread {
  customer_id: string
  customer_name: string
  customer_phone: string
  last_message: string
  last_message_time: string
  channel: string
  sender: string
}

export const getConversations = (customerId: string) =>
  pb.collection('conversations').getFullList<Conversation>({
    filter: `customer_id = "${customerId}"`,
    sort: 'created',
  })

export const createConversation = (data: Partial<Conversation>) =>
  pb.collection('conversations').create<Conversation>(data)

export const getInboxThreads = async (): Promise<InboxThread[]> => {
  const records = await pb.collection('conversations').getList<Conversation>(1, 200, {
    filter: `user_id = "${pb.authStore.record?.id}"`,
    sort: '-created',
    expand: 'customer_id',
  })

  const grouped = new Map<string, Conversation>()
  for (const conv of records.items) {
    if (!grouped.has(conv.customer_id)) {
      grouped.set(conv.customer_id, conv)
    }
  }

  return Array.from(grouped.values()).map((conv) => ({
    customer_id: conv.customer_id,
    customer_name: conv.expand?.customer_id?.name || 'Desconhecido',
    customer_phone: conv.expand?.customer_id?.phone || '',
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
