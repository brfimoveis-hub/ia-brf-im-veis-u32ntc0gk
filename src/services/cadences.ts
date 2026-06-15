import pb from '@/lib/pocketbase/client'

export interface Cadence {
  id: string
  title: string
  description: string
  content: string
  ai_instructions: string
  order: number
  is_active: boolean
  steps: any
  ebook_file: string
  price_table_file: string
  created: string
  updated: string
}

export const getCadences = () => pb.collection('cadences').getFullList<Cadence>({ sort: 'order' })
export const createCadence = (data: Partial<Cadence>) =>
  pb.collection('cadences').create<Cadence>(data)
export const updateCadence = (id: string, data: Partial<Cadence>) =>
  pb.collection('cadences').update<Cadence>(id, data)
export const deleteCadence = (id: string) => pb.collection('cadences').delete(id)
