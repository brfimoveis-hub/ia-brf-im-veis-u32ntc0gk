import pb from '@/lib/pocketbase/client'
import type { Cadence } from '@/services/cadences'

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
  last_name?: string
  phase?: string
  is_blocked?: boolean
  tags?: string[]
  email_1_value?: string
  phone_1_value?: string
  urgency?: number
  neighborhood?: string
  price_range?: string
  lead_profile?: string
  last_sent_at?: string
}

export const createCustomer = (data: Partial<Customer>) =>
  pb.collection('customers').create<Customer>(data)

export const getActiveCadences = () =>
  pb.collection('cadences').getFullList<Cadence>({ filter: 'is_active = true', sort: 'order' })

export interface PaginatedCustomersResult {
  items: Customer[]
  totalItems: number
  totalPages: number
  page: number
  perPage: number
}

export const getPaginatedCustomers = async (
  page: number,
  perPage: number,
  search = '',
  phaseFilter = 'all',
  sourceFilter = '',
): Promise<PaginatedCustomersResult> => {
  const parts: string[] = []
  if (search.trim()) {
    const safe = search.trim().replace(/"/g, '\\"')
    parts.push(
      `(name ~ "${safe}" || phone ~ "${safe}" || first_name ~ "${safe}" || email ~ "${safe}" || phone_1_value ~ "${safe}" || email_1_value ~ "${safe}")`,
    )
  }
  if (phaseFilter && phaseFilter !== 'all') {
    parts.push(`status = "${phaseFilter.replace(/"/g, '\\"')}"`)
  }
  if (sourceFilter) {
    parts.push(`source = "${sourceFilter.replace(/"/g, '\\"')}"`)
  }
  const filter = parts.join(' && ')
  return pb.collection('customers').getList<Customer>(page, perPage, {
    filter: filter || undefined,
    sort: '-updated',
  })
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

export const createCustomerWithRetry = async (
  data: Partial<Customer>,
  retries = 3,
): Promise<Customer> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pb.collection('customers').create<Customer>(data)
    } catch (err: any) {
      if (i === retries - 1) throw err
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
    }
  }
  throw new Error('Failed to create customer after retries')
}

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

export const fetchAllCustomerIds = async (filter: string): Promise<string[]> => {
  const records = await pb.collection('customers').getFullList({
    filter: filter || undefined,
    fields: 'id',
  })
  return records.map((r) => r.id)
}

export const fetchCustomersByIds = async (ids: string[]): Promise<Customer[]> => {
  if (ids.length === 0) return []
  const all: Customer[] = []
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const f = chunk.map((id) => `id = "${id}"`).join(' || ')
    try {
      const res = await pb.collection('customers').getList<Customer>(1, 50, { filter: f })
      all.push(...res.items)
    } catch (err) {
      console.error('fetchCustomersByIds error', err)
    }
  }
  return all
}
