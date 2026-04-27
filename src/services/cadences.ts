import pb from '@/lib/pocketbase/client'

export interface Cadence {
  id: string
  user_id: string
  title: string
  content: string
  order: number
  is_active: boolean
  ai_instructions?: string
  ebook_file?: string
  price_table_file?: string
  created: string
  updated: string
}

export const getCadences = () => pb.collection('cadences').getFullList<Cadence>({ sort: 'order' })
export const getActiveCadences = () =>
  pb.collection('cadences').getFullList<Cadence>({ filter: 'is_active = true', sort: 'order' })
export const createCadence = (data: Partial<Cadence> | FormData) => {
  if (data instanceof FormData) {
    data.append('user_id', pb.authStore.record?.id || '')
    return pb.collection('cadences').create<Cadence>(data)
  }
  return pb.collection('cadences').create<Cadence>({ ...data, user_id: pb.authStore.record?.id })
}
export const updateCadence = (id: string, data: Partial<Cadence> | FormData) =>
  pb.collection('cadences').update<Cadence>(id, data)
export const deleteCadence = (id: string) => pb.collection('cadences').delete(id)
