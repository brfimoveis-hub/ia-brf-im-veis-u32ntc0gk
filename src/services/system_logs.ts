import pb from '@/lib/pocketbase/client'
import { RecordModel } from 'pocketbase'

export interface SystemLog extends RecordModel {
  type: string
  message: string
  details?: any
  payload?: any
}

export const getSystemLogs = async (page = 1, perPage = 50) => {
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
