import pb from '@/lib/pocketbase/client'

export interface Conversation {
  id: string
  customer_id: string
  content: string
  sender: 'customer' | 'agent' | 'ai' | 'system'
  created: string
  updated: string
}

export const getConversations = (customerId: string) =>
  pb.collection('conversations').getFullList<Conversation>({
    filter: `customer_id = "${customerId}"`,
    sort: 'created',
  })

export const createConversation = (data: Partial<Conversation>) =>
  pb.collection('conversations').create<Conversation>(data)
