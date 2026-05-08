import pb from '@/lib/pocketbase/client'

export interface SystemLog {
  id: string
  user_id?: string
  type: string
  message: string
  details: any
  payload: any
  created: string
  updated: string
}

export const createSystemLog = async (data: Partial<SystemLog>) => {
  try {
    return await pb.collection('system_logs').create<SystemLog>({
      ...data,
      ...(pb.authStore.record?.id ? { user_id: pb.authStore.record.id } : {}),
    })
  } catch (error) {
    console.warn('System log creation skipped or failed:', error)
    return null
  }
}

export const deleteSystemLog = async (id: string) => {
  try {
    return await pb.collection('system_logs').delete(id)
  } catch (error) {
    console.warn('System log deletion skipped or failed:', error)
    return false
  }
}

export const getSystemLogs = async (page = 1, perPage = 50, typeFilter?: string) => {
  try {
    const options: any = { sort: '-created' }
    if (typeFilter) {
      options.filter = `type = "${typeFilter}"`
    }
    return await pb.collection('system_logs').getList<SystemLog>(page, perPage, options)
  } catch (error) {
    console.warn('System logs fetch skipped or failed:', error)
    return { page, perPage, totalItems: 0, totalPages: 0, items: [] }
  }
}
