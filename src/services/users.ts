import pb from '@/lib/pocketbase/client'

export const getCurrentUser = (id: string) => pb.collection('users').getOne(id)
