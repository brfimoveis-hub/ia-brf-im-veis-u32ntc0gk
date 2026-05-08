import pb from '@/lib/pocketbase/client'

export const createSystemLog = async (data: any) => {
  console.log('System log creation is managed internally by PocketBase', data)
  return null
}

export const deleteSystemLog = async (id: string) => {
  console.log('System log deletion is managed internally by PocketBase', id)
  return null
}

export const getSystemLogs = async (page = 1, perPage = 50) => {
  try {
    // Standard access to _logs requires superuser privileges
    return await pb.collection('_logs').getList(page, perPage, {
      sort: '-created',
    })
  } catch (error) {
    console.error('Failed to fetch system logs:', error)
    // Return empty mock if user does not have permission or endpoint fails
    return {
      items: [],
      page: 1,
      perPage,
      totalItems: 0,
      totalPages: 0,
    }
  }
}
