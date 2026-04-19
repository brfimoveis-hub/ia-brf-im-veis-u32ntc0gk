import pb from '@/lib/pocketbase/client'
import type { ListResult } from 'pocketbase'

export interface Customer {
  id: string
  user_id: string
  name: string
  email?: string
  phone?: string
  status: string
  notes?: string
  tags?: string[]
  created: string
  updated: string

  first_name?: string
  middle_name?: string
  last_name?: string
  phonetic_first_name?: string
  phonetic_middle_name?: string
  phonetic_last_name?: string
  name_prefix?: string
  name_suffix?: string
  nickname?: string
  file_as?: string
  org_name?: string
  org_title?: string
  org_dept?: string
  birthday?: string
  photo?: string
  source?: string
  email_1_label?: string
  email_1_value?: string
  email_2_label?: string
  email_2_value?: string
  phone_1_label?: string
  phone_1_value?: string
  phone_2_label?: string
  phone_2_value?: string
  phone_3_label?: string
  phone_3_value?: string
  phone_4_label?: string
  phone_4_value?: string
  address_1_label?: string
  address_1_formatted?: string
  address_1_street?: string
  address_1_city?: string
  address_1_po_box?: string
  address_1_region?: string
  address_1_postal_code?: string
  address_1_country?: string
  address_1_extended?: string
  website_1_label?: string
  website_1_value?: string
}

export const getCustomers = async (): Promise<Customer[]> => {
  return pb.collection('customers').getFullList<Customer>({ sort: '-created' })
}

export const getPaginatedCustomers = async (
  page: number = 1,
  perPage: number = 50,
  search: string = '',
  phaseFilter: string = 'all',
  sourceFilter: string = '',
): Promise<ListResult<Customer>> => {
  const filters: string[] = []
  if (search) {
    const safeSearch = search.replace(/"/g, '\\"')
    filters.push(
      `(name ~ "${safeSearch}" || email ~ "${safeSearch}" || phone ~ "${safeSearch}" || first_name ~ "${safeSearch}" || email_1_value ~ "${safeSearch}" || phone_1_value ~ "${safeSearch}")`,
    )
  }
  if (phaseFilter !== 'all') {
    const safePhase = phaseFilter.replace(/"/g, '\\"')
    filters.push(`status = "${safePhase}"`)
  }
  if (sourceFilter) {
    const safeSource = sourceFilter.replace(/"/g, '\\"')
    filters.push(`source ~ "${safeSource}"`)
  }

  const filterString = filters.join(' && ')

  return pb.collection('customers').getList<Customer>(page, perPage, {
    sort: '-created',
    filter: filterString,
  })
}

export const getCustomer = async (id: string): Promise<Customer> => {
  return pb.collection('customers').getOne<Customer>(id)
}

export const createCustomer = async (data: Partial<Customer>): Promise<Customer> => {
  if (!data.user_id && pb.authStore.record) {
    data.user_id = pb.authStore.record.id
  }
  return pb.collection('customers').create<Customer>(data)
}

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<Customer> => {
  return pb.collection('customers').update<Customer>(id, data)
}

export const deleteCustomer = async (id: string): Promise<void> => {
  await pb.collection('customers').delete(id)
}

export const deleteAllCustomers = async (): Promise<void> => {
  let hasMore = true
  while (hasMore) {
    const page = await pb.collection('customers').getList<Customer>(1, 500, { fields: 'id' })
    if (page.items.length === 0) {
      hasMore = false
      break
    }
    const batchSize = 50
    for (let i = 0; i < page.items.length; i += batchSize) {
      const batch = page.items.slice(i, i + batchSize)
      await Promise.all(batch.map((c) => pb.collection('customers').delete(c.id)))
    }
  }
}

export const bulkDeleteCustomers = async (): Promise<void> => {
  await pb.send('/backend/v1/customers/bulk-delete', { method: 'POST' })
}
