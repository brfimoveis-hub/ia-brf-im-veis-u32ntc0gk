import pb from '@/lib/pocketbase/client'

export const getConversations = (page: number = 1, limit: number = 50, options?: any) =>
  pb.collection('conversations').getList(page, limit, options)

export const createConversation = (data: any) => pb.collection('conversations').create(data)

export const getRecentConversations = () =>
  pb.collection('conversations').getList(1, 10, {
    sort: '-created',
    expand: 'customer_id',
  })

export const getAiConversations = () =>
  pb.collection('conversations').getFullList({
    filter: "sender = 'ai'",
    fields: 'customer_id',
  })
