import pb from '@/lib/pocketbase/client'

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
  const customers = await getCustomers()
  await Promise.all(customers.map((c) => pb.collection('customers').delete(c.id)))
}
