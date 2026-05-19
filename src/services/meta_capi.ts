import pb from '@/lib/pocketbase/client'

/**
 * Service to test the Meta CAPI connection bypassing the UI lifecycle.
 */
export const testMetaCapiConnectionService = async (
  businessId: string,
  pixelId: string,
  accessToken: string,
) => {
  const payload = {
    business_id: businessId.trim(),
    pixel_id: pixelId.trim(),
    access_token: accessToken.trim(),
  }

  // Diagnostic API Logging
  console.log('--- DEBUG: Meta CAPI Test Payload ---', {
    business_id: payload.business_id ? '***' + payload.business_id.slice(-4) : undefined,
    pixel_id: payload.pixel_id ? '***' + payload.pixel_id.slice(-4) : undefined,
    access_token: payload.access_token ? '***' + payload.access_token.slice(-4) : undefined,
    structure: Object.keys(payload),
  })

  return pb.send('/backend/v1/meta_capi_test_connection', {
    method: 'POST',
    body: payload,
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
  businessId: string,
  metaPixelId: string,
  metaCapiToken: string,
) => {
  return pb.collection('users').update(userId, {
    meta_whatsapp_business_id: businessId.trim(),
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

    const errorData = error.response?.data ? error.response.data : {}
    const metaErr = errorData.error || errorData

    let specificError = errorMsg
    if (metaErr.error_user_title) {
      specificError = `${metaErr.error_user_title}: ${metaErr.error_user_msg}`
    } else if (metaErr.error_user_msg) {
      specificError = metaErr.error_user_msg
    } else if (metaErr.message) {
      specificError = metaErr.message
    }

    if (
      metaErr.type === 'OAuthException' ||
      JSON.stringify(errorData).toLowerCase().includes('invalid parameter')
    ) {
      specificError = `Erro de Parâmetro Inválido: ${specificError}`
    }

    await updateMetaCapiStatus(userId, specificError).catch(() => {})
    throw error
  }
}
