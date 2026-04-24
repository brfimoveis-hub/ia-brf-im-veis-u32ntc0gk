import pb from '@/lib/pocketbase/client'

export interface SystemLog {
  id: string
  user_id: string
  type: string
  message: string
  details: string
  payload: any
  created: string
  updated: string
}

export const getSystemLogs = (page = 1, perPage = 50) =>
  pb.collection('system_logs').getList<SystemLog>(page, perPage, {
    sort: '-created',
  })
