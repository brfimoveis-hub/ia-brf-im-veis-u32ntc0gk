import pb from '@/lib/pocketbase/client'

export const updateUserIntegrations = (userId: string, data: any) => {
  return pb.collection('users').update(userId, data)
}
