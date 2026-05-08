import pb from '@/lib/pocketbase/client'

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
