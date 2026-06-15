import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getCadences = (): Promise<RecordModel[]> =>
  pb.collection('cadences').getFullList({ sort: 'order' })

export const getCadence = (id: string): Promise<RecordModel> => pb.collection('cadences').getOne(id)

export const updateCadence = (id: string, data: Partial<RecordModel>): Promise<RecordModel> =>
  pb.collection('cadences').update(id, data)
