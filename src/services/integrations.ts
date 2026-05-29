import pb from '@/lib/pocketbase/client'

export const getUazapiQrCode = async () => {
  try {
    return await pb.send('/backend/v1/uazapi/qrcode', { method: 'POST' })
  } catch (err) {
    return await pb.send('/backend/v1/uazapi/qrcode', { method: 'GET' })
  }
}

export const restartUazapi = async () => {
  try {
    return await pb.send('/backend/v1/uazapi/restart', { method: 'POST' })
  } catch (err) {
    return await pb.send('/backend/v1/uazapi/restart', { method: 'GET' })
  }
}

export const disconnectUazapi = async () => {
  try {
    return await pb.send('/backend/v1/uazapi/disconnect', { method: 'POST' })
  } catch (err) {
    return await pb.send('/backend/v1/uazapi/disconnect', { method: 'GET' })
  }
}

export const updateUserIntegrations = (userId: string, data: any) => {
  return pb.collection('users').update(userId, data)
}
