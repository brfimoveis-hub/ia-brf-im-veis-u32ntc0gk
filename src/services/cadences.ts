import pb from '@/lib/pocketbase/client'

export const getCadences = async () => {
  try {
    const res = await pb.collection('cadences').getFullList()
    return res
  } catch (e) {
    return []
  }
}

export const createCadence = async (data: any) => {
  return await pb.collection('cadences').create(data)
}

export const updateCadence = async (id: string, data: any) => {
  return await pb.collection('cadences').update(id, data)
}

export const deleteCadence = async (id: string) => {
  return await pb.collection('cadences').delete(id)
}
