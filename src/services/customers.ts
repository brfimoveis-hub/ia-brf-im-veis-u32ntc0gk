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
  is_blocked?: boolean
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
  perPage: number = 100,
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const createCustomerWithRetry = async (
  data: Partial<Customer>,
  maxRetries = 5,
): Promise<Customer> => {
  let attempt = 0
  while (attempt < maxRetries) {
    try {
      if (!data.user_id && pb.authStore.record) {
        data.user_id = pb.authStore.record.id
      }
      return await pb.collection('customers').create<Customer>(data)
    } catch (error: any) {
      if (error?.status === 429 || error?.status === 0 || error?.status >= 500) {
        attempt++
        if (attempt >= maxRetries) throw error
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000
        console.warn(
          `Rate limited or network error. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt}/${maxRetries})`,
        )
        await sleep(delay)
      } else {
        throw error
      }
    }
  }
  throw new Error('Failed to create customer after retries.')
}

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<Customer> => {
  return pb.collection('customers').update<Customer>(id, data)
}

export const deleteCustomer = async (id: string): Promise<void> => {
  await pb.collection('customers').delete(id)
}

export const deleteAllCustomers = async (): Promise<void> => {
  throw new Error(
    'A exclusão de todos os clientes foi desabilitada por segurança para evitar perda de dados.',
  )
}

export const bulkDeleteCustomers = async (ids?: string[]): Promise<void> => {
  await pb.send('/backend/v1/customers/bulk-delete', {
    method: 'POST',
    body: ids ? JSON.stringify({ ids }) : undefined,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const syncRemarketing = async (
  payloads: { id: string; em?: string; ph?: string; tags: string[] }[],
  keyword: string,
  eventName: string,
  batchSize?: number,
  intervalMinutes?: number,
): Promise<{ success: boolean; synced: number }> => {
  return pb.send('/backend/v1/meta-remarketing-sync', {
    method: 'POST',
    body: JSON.stringify({ payloads, keyword, eventName, batchSize, intervalMinutes }),
    headers: { 'Content-Type': 'application/json' },
  })
}
