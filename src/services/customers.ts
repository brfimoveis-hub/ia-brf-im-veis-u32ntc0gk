import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Customer extends RecordModel {
  name: string
  email: string
  phone: string
  status: string
  tags: string[]
  notes?: string
  user_id: string
}

export const getCustomers = () =>
  pb.collection('customers').getFullList<Customer>({ sort: '-created' })

export const createCustomer = (data: Partial<Customer>) => {
  if (pb.authStore.record) {
    data.user_id = pb.authStore.record.id
  }
  return pb.collection('customers').create<Customer>(data)
}

export const updateCustomer = (id: string, data: Partial<Customer>) =>
  pb.collection('customers').update<Customer>(id, data)

export const deleteCustomer = (id: string) => pb.collection('customers').delete(id)
