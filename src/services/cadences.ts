import pb from '@/lib/pocketbase/client'

export interface Cadence {
  id: string
  user_id: string
  title: string
  content: string
  order: number
  is_active: boolean
  created: string
  updated: string
}

export const getCadences = () => pb.collection('cadences').getFullList<Cadence>({ sort: 'order' })
export const createCadence = (data: Partial<Cadence>) =>
  pb.collection('cadences').create<Cadence>({ ...data, user_id: pb.authStore.record?.id })
export const updateCadence = (id: string, data: Partial<Cadence>) =>
  pb.collection('cadences').update<Cadence>(id, data)
export const deleteCadence = (id: string) => pb.collection('cadences').delete(id)
