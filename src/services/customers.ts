import pb from '@/lib/pocketbase/client'

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  status: string
  notes: string
  source: string
  created: string
  updated: string
  first_name?: string
  phase?: string
  is_blocked?: boolean
  tags?: string[]
}

export const getCustomers = () =>
  pb.collection('customers').getFullList<Customer>({ sort: '-updated' })
export const getCustomer = (id: string) => pb.collection('customers').getOne<Customer>(id)
export const updateCustomer = (id: string, data: Partial<Customer>) =>
  pb.collection('customers').update<Customer>(id, data)
export const deleteCustomer = (id: string) => pb.collection('customers').delete(id)
