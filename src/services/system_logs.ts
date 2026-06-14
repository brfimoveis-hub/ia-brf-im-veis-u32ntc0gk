import pb from '@/lib/pocketbase/client'

export interface SystemLog {
  id: string
  type: string
  message: string
  details?: any
  payload?: any
  created: string
  updated: string
}

export const getSystemLogs = async (page = 1, perPage = 500) => {
  return pb.collection('system_logs').getList<SystemLog>(page, perPage, {
    sort: '-created',
  })
}

export const createSystemLog = async (data: Partial<SystemLog>) => {
  return pb.collection('system_logs').create<SystemLog>(data)
}

export const deleteSystemLog = async (id: string) => {
  return pb.collection('system_logs').delete(id)
}
