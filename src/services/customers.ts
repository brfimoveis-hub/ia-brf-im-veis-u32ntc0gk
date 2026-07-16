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
  email_1_value?: string
  phone_1_value?: string
  urgency?: number
  neighborhood?: string
  price_range?: string
}

export interface SyncRemarketingPayload {
  id: string
  name: string
  em?: string
  ph?: string
  tags?: string[]
}

export interface SyncRemarketingResult {
  success: boolean
  synced: number
  message: string
}

export const getCustomers = () =>
  pb.collection('customers').getFullList<Customer>({ sort: '-updated' })
export const getCustomer = (id: string) => pb.collection('customers').getOne<Customer>(id)
export const updateCustomer = (id: string, data: Partial<Customer>) =>
  pb.collection('customers').update<Customer>(id, data)
export const deleteCustomer = (id: string) => pb.collection('customers').delete(id)

export const syncRemarketing = async (
  payloads: SyncRemarketingPayload[],
  searchTerm: string,
  eventName: string,
  batchSize: number,
  intervalMinutes: number,
): Promise<SyncRemarketingResult> => {
  return pb.send('/backend/v1/meta-remarketing-sync', {
    method: 'POST',
    body: {
      payloads,
      eventName,
      searchTerm,
      batchSize,
      intervalMinutes,
    },
  })
}
