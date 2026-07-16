import pb from '@/lib/pocketbase/client'

export const getUazapiQrCode = async () => {
  throw new Error('Uazapi integration has been removed.')
}

export const restartUazapi = async () => {
  throw new Error('Uazapi integration has been removed.')
}

export const disconnectUazapi = async () => {
  throw new Error('Uazapi integration has been removed.')
}

export const resyncUazapi = async () => {
  throw new Error('Uazapi integration has been removed.')
}

export const getUazapiStatus = async () => {
  throw new Error('Uazapi integration has been removed.')
}

export const testUazapiConnection = async (_domain: string, _instance: string, _token: string) => {
  throw new Error('Uazapi integration has been removed.')
}

export const updateUserIntegrations = (userId: string, data: any) => {
  return pb.collection('users').update(userId, data)
}
