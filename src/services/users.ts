import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const updateUser = (id: string, data: any): Promise<RecordModel> =>
  pb.collection('users').update(id, data)
