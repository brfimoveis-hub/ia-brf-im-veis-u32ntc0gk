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

export const createSystemLog = (data: Partial<SystemLog>) => {
  return pb.collection('system_logs').create<SystemLog>({
    ...data,
    user_id: pb.authStore.record?.id,
  })
}

export const getSystemLogs = (page = 1, perPage = 50, typeFilter?: string) => {
  const options: any = { sort: '-created' }
  if (typeFilter) {
    options.filter = `type = "${typeFilter}"`
  }
  return pb.collection('system_logs').getList<SystemLog>(page, perPage, options)
}
