import pb from '@/lib/pocketbase/client'

export const getCustomer = (id: string, options?: any) =>
  pb.collection('customers').getOne(id, options)

export const getDashboardCustomers = () =>
  pb.collection('customers').getFullList({
    fields: 'id,status,created',
  })

export const getPaginatedCustomers = (page: number = 1, limit: number = 50, options?: any) =>
  pb.collection('customers').getList(page, limit, options)

export const createCustomer = (data: any) => pb.collection('customers').create(data)

export const updateCustomer = (id: string, data: any) => pb.collection('customers').update(id, data)

export const deleteCustomer = (id: string) => pb.collection('customers').delete(id)

export const syncRemarketing = (data?: any) =>
  pb.send('/backend/v1/meta/remarketing/sync', {
    method: 'POST',
    body: JSON.stringify(data || {}),
    headers: { 'Content-Type': 'application/json' },
  })
