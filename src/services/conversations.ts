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
  follow_up_count?: number
  follow_up_step?: string
  last_follow_up_at?: string
  next_follow_up_at?: string
  persistence_status?: string
  promise_pending?: boolean
  promise_made_at?: string
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
      follow_up_step?: string
      follow_up_count?: number
      last_follow_up_at?: string
      next_follow_up_at?: string
      persistence_status?: string
      promise_pending?: boolean
      promise_context?: string
      tags?: string[]
      notes?: string
    }
  }
}

export interface InboxThread {
  customer_id: string
  customer_name: string
  customer_phone: string
  customer_status?: string
  customer_source?: string
  last_message: string
  last_message_time: string
  channel: string
  sender: string
  unread_or_active?: boolean
  follow_up_step?: string
  follow_up_count?: number
  last_follow_up_at?: string
  next_follow_up_at?: string
  persistence_status?: string
  promise_pending?: boolean
  is_blocked?: boolean
  tags?: string[]
}

export const getConversations = (customerId: string) =>
  pb.collection('conversations').getFullList<Conversation>({
    filter: `customer_id = "${customerId}"`,
    sort: 'created',
    expand: 'customer_id',
  })

export const createConversation = (data: Partial<Conversation>) =>
  pb.collection('conversations').create<Conversation>(data)

import { isAutomatedSystemThread } from '@/lib/system-messages'

export const getInboxThreads = async (userId?: string): Promise<InboxThread[]> => {
  const currentUserId = userId || pb.authStore.record?.id
  const filter = currentUserId ? `user_id = "${currentUserId}"` : ''

  const records = await pb.collection('conversations').getList<Conversation>(1, 500, {
    ...(filter ? { filter } : {}),
    sort: '-created',
    expand: 'customer_id',
  })

  const now = Date.now()
  const dayMs = 24 * 60 * 60 * 1000

  const grouped = new Map<string, Conversation>()
  for (const conv of records.items) {
    if (conv.customer_id && !grouped.has(conv.customer_id)) {
      grouped.set(conv.customer_id, conv)
    }
  }

  return Array.from(grouped.values())
    .map((conv) => {
      const cust = conv.expand?.customer_id
      const custName = cust?.name || 'Sem nome'
      const custPhone = cust?.phone || ''
      const createdTime = new Date(conv.created).getTime()
      const isActive = !Number.isNaN(createdTime) && now - createdTime <= dayMs

      return {
        customer_id: conv.customer_id,
        customer_name: custName,
        customer_phone: custPhone,
        customer_status: cust?.status || '',
        customer_source: cust?.source || '',
        last_message: conv.content || '',
        last_message_time: conv.created,
        channel: conv.channel || 'whatsapp',
        sender: conv.sender,
        unread_or_active: isActive,
        follow_up_step: cust?.follow_up_step || conv.follow_up_step || '',
        follow_up_count: cust?.follow_up_count ?? conv.follow_up_count ?? 0,
        last_follow_up_at: cust?.last_follow_up_at || conv.last_follow_up_at || '',
        next_follow_up_at: cust?.next_follow_up_at || conv.next_follow_up_at || '',
        persistence_status: cust?.persistence_status || conv.persistence_status || '',
        promise_pending: cust?.promise_pending ?? conv.promise_pending ?? false,
        is_blocked: cust?.is_blocked ?? false,
        tags: cust?.tags || [],
      }
    })
    .filter(
      (thread) =>
        !isAutomatedSystemThread({
          sender: thread.sender,
          customer_name: thread.customer_name,
          customer_phone: thread.customer_phone,
          last_message: thread.last_message,
        }),
    )
}

export const sendManualReply = async (customerId: string, content: string, channel?: string) =>
  pb.collection('conversations').create<Conversation>({
    customer_id: customerId,
    user_id: pb.authStore.record?.id,
    sender: 'agent',
    content,
    channel: channel || 'whatsapp',
  })
