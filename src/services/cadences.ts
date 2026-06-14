import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Cadence extends RecordModel {
  name?: string
  description?: string
  status?: string
  [key: string]: any
}

export const getCadences = async (filter?: string) => {
  return pb.collection('cadences').getFullList<Cadence>({
    sort: '-created',
    filter,
  })
}

export const getCadence = async (id: string) => {
  return pb.collection('cadences').getOne<Cadence>(id)
}

export const createCadence = async (data: Partial<Cadence>) => {
  return pb.collection('cadences').create<Cadence>(data)
}

export const updateCadence = async (id: string, data: Partial<Cadence>) => {
  return pb.collection('cadences').update<Cadence>(id, data)
}

export const deleteCadence = async (id: string) => {
  return pb.collection('cadences').delete(id)
}
