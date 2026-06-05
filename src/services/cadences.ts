import pb from '@/lib/pocketbase/client'

export const getCadences = async () => {
  try {
    const res = await pb.collection('cadences').getFullList()
    return res
  } catch (e) {
    return []
  }
}
