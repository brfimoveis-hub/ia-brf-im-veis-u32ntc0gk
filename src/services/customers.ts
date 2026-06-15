import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export const getCustomers = (): Promise<RecordModel[]> =>
  pb.collection('customers').getFullList({ sort: '-created' })

export const getCustomer = (id: string): Promise<RecordModel> =>
  pb.collection('customers').getOne(id)

export const updateCustomer = (id: string, data: Partial<RecordModel>): Promise<RecordModel> =>
  pb.collection('customers').update(id, data)
