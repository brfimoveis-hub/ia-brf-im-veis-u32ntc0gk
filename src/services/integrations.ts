import pb from '@/lib/pocketbase/client'

export const getUazapiQrCode = async () => {
  return pb.send('/backend/v1/uazapi/qrcode', { method: 'GET' })
}

export const restartUazapi = async () => {
  return pb.send('/backend/v1/uazapi/restart', { method: 'POST' })
}

export const disconnectUazapi = async () => {
  return pb.send('/backend/v1/uazapi/disconnect', { method: 'POST' })
}

export const resyncUazapi = async () => {
  return pb.send('/backend/v1/uazapi/resync', { method: 'POST' })
}

export const getUazapiStatus = async () => {
  return pb.send('/backend/v1/uazapi/status', { method: 'GET' })
}

export const testUazapiConnection = async (domain: string, instance: string, token: string) => {
  return pb.send('/backend/v1/uazapi/test-connection', {
    method: 'POST',
    body: JSON.stringify({ domain, instance, token }),
    headers: { 'Content-Type': 'application/json' },
  })
}

export const updateUserIntegrations = (userId: string, data: any) => {
  return pb.collection('users').update(userId, data)
}
