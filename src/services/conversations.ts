import pb from '@/lib/pocketbase/client'

export interface Conversation {
  id: string
  user_id: string
  customer_id: string
  content: string
  sender: 'user' | 'customer' | 'agent' | 'ai' | 'system'
  created: string
  updated: string
}

export const getConversations = async (customerId?: string): Promise<Conversation[]> => {
  const options: any = { sort: 'created' }
  if (customerId) {
    options.filter = `customer_id = "${customerId}"`
  }
  return pb.collection('conversations').getFullList<Conversation>(options)
}

export const createConversation = async (data: Partial<Conversation>): Promise<Conversation> => {
  if (!data.user_id && pb.authStore.record) {
    data.user_id = pb.authStore.record.id
  }
  return pb.collection('conversations').create<Conversation>(data)
}
