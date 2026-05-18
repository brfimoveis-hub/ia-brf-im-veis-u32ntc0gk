import pb from '@/lib/pocketbase/client'

/**
 * Service to test the Meta CAPI connection bypassing the UI lifecycle.
 */
export const testMetaCapiConnectionService = async (
  businessId: string,
  pixelId: string,
  accessToken: string,
) => {
  return pb.send('/backend/v1/meta_capi_test_connection', {
    method: 'POST',
    body: {
      business_id: businessId.trim(),
      pixel_id: pixelId.trim(),
      access_token: accessToken.trim(),
    },
  })
}

/**
 * Update the user's meta CAPI token status.
 */
export const updateMetaCapiStatus = async (userId: string, status: string) => {
  return pb.collection('users').update(userId, { meta_token_status: status })
}

/**
 * Save the Meta CAPI settings.
 */
export const saveMetaCapiSettings = async (
  userId: string,
  metaPixelId: string,
  metaCapiToken: string,
) => {
  return pb.collection('users').update(userId, {
    meta_pixel_id: metaPixelId.trim(),
    meta_capi_token: metaCapiToken.trim(),
  })
}

/**
 * Execute the CAPI verification independently from UI lifecycle.
 */
export const executeCapiVerification = async (
  userId: string,
  businessId: string,
  pixelId: string,
  accessToken: string,
) => {
  try {
    await testMetaCapiConnectionService(businessId, pixelId, accessToken)
    await updateMetaCapiStatus(userId, 'connected')
    return { success: true }
  } catch (error: any) {
    const errorMsg =
      error.response?.message || error.message || 'Falha de comunicação com Meta CAPI'
    await updateMetaCapiStatus(userId, errorMsg).catch(() => {})
    throw error
  }
}
