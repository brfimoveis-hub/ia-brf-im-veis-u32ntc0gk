import pb from '@/lib/pocketbase/client'

export const testMetaCapiConnectionService = async (
  businessId: string,
  datasetId: string,
  accessToken: string,
) => {
  const cleanDatasetId = datasetId.replace(/\D/g, '').trim()
  return pb.send('/backend/v1/meta_capi_test_connection', {
    method: 'POST',
    body: {
      business_id: businessId.replace(/\D/g, '').trim(),
      pixel_id: cleanDatasetId,
      dataset_id: cleanDatasetId,
      access_token: accessToken.trim(),
    },
  })
}

export const updateMetaCapiStatus = async (userId: string, status: string) => {
  return pb.collection('users').update(userId, { meta_token_status: status })
}

export const saveMetaCapiSettings = async (
  userId: string,
  businessId: string,
  metaDatasetId: string,
  metaCapiToken: string,
) => {
  const cleanDatasetId = metaDatasetId.replace(/\D/g, '').trim()
  const payload: Record<string, any> = {
    meta_whatsapp_business_id: businessId.replace(/\D/g, '').trim(),
    meta_pixel_id: cleanDatasetId,
    meta_dataset_id: cleanDatasetId,
    meta_capi_token: metaCapiToken.trim(),
  }

  if (payload.meta_whatsapp_business_id) {
    payload.meta_whatsapp_status = 'active'
  }

  return pb.collection('users').update(userId, payload)
}

export const executeCapiVerification = async (
  userId: string,
  businessId: string,
  datasetId: string,
  accessToken: string,
) => {
  try {
    await testMetaCapiConnectionService(businessId, datasetId, accessToken)
    await updateMetaCapiStatus(userId, 'valid')
    return { success: true }
  } catch (error: any) {
    const errorData = error.response || {}
    const metaErr = errorData.error || {}
    const errorMsg =
      metaErr.message || errorData.message || error.message || 'Falha de comunicação com Meta CAPI'

    await updateMetaCapiStatus(userId, errorMsg).catch(() => {})

    const newError = new Error(errorMsg) as any
    newError.response = error.response
    throw newError
  }
}
