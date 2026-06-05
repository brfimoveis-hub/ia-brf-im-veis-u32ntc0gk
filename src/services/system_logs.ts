import pb from '@/lib/pocketbase/client'

export interface SystemLog {
  id: string
  created: string
  type: string
  message: string
  details: any
  payload: any
}

export const getSystemLogs = async (page = 1, perPage = 200) => {
  try {
    const res = await pb.collection('system_logs').getList<SystemLog>(page, perPage, {
      sort: '-created',
    })
    return res
  } catch (e) {
    return { items: [], totalItems: 0, page: 1, perPage: 200, totalPages: 0 }
  }
}

export const createSystemLog = async (data: Partial<SystemLog>) => {
  try {
    return await pb.collection('system_logs').create<SystemLog>(data)
  } catch (e) {
    return null
  }
}

export const deleteSystemLog = async (id: string) => {
  return await pb.collection('system_logs').delete(id)
}
