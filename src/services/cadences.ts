import pb from '@/lib/pocketbase/client'

export interface Cadence {
  id: string
  title: string
  content: string
  is_active: boolean
  [key: string]: any
}

export const getCadences = async () => {
  return pb.collection('cadences').getFullList<Cadence>({
    sort: '-created',
  })
}
