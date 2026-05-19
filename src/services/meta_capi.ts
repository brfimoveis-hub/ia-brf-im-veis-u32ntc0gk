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
    business_id: businessId.replace(/\D/g, '').trim(),
    pixel_id: pixelId.replace(/\D/g, '').trim(),
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
  const payload: any = {
    meta_whatsapp_business_id: businessId.replace(/\D/g, '').trim(),
    meta_pixel_id: metaPixelId.replace(/\D/g, '').trim(),
    meta_capi_token: metaCapiToken.trim(),
  }

  if (payload.meta_whatsapp_business_id) {
    payload.meta_whatsapp_status = 'active'
  }

  return pb.collection('users').update(userId, payload)
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
    await updateMetaCapiStatus(userId, 'valid')
    return { success: true }
  } catch (error: any) {
    const errorMsg =
      error.response?.message || error.message || 'Falha de comunicação com Meta CAPI'

    const errorData = error.response || {}
    const metaErr = errorData.error || errorData

    let specificError = errorMsg
    if (metaErr.error_user_title) {
      specificError = `${metaErr.error_user_title}: ${metaErr.error_user_msg}`
    } else if (metaErr.error_user_msg) {
      specificError = metaErr.error_user_msg
    } else if (metaErr.message) {
      specificError = metaErr.message
    }

    const errorString = JSON.stringify(errorData).toLowerCase()

    if (errorMsg.includes('Faltam:')) {
      specificError = errorMsg
    } else if (
      errorString.includes('permissões insuficientes') ||
      (errorData.message && errorData.message.toLowerCase().includes('permissões insuficientes')) ||
      errorString.includes('permission denied') ||
      (metaErr.message && metaErr.message.toLowerCase().includes('permission denied'))
    ) {
      specificError = `Permissões insuficientes. Faltam: ads_management, business_management, ads_read`
    } else if (
      errorString.includes('token de acesso inválido') ||
      (errorData.message && errorData.message.toLowerCase().includes('token de acesso inválido')) ||
      errorString.includes('access_token') ||
      errorString.includes('invalid token') ||
      errorString.includes('oauth') ||
      metaErr.code === 190 ||
      metaErr.type === 'OAuthException'
    ) {
      specificError = `Erro no Token de Acesso: O token fornecido é inválido, expirou ou não tem as permissões corretas.`
    } else if (
      errorString.includes('pixel') ||
      errorString.includes('dataset') ||
      (metaErr.message && metaErr.message.toLowerCase().includes(pixelId))
    ) {
      specificError = `Erro no Pixel ID: O Pixel ID '${pixelId}' é inválido ou o token não tem permissão para acessá-lo. Detalhe: ${specificError}`
    } else if (
      errorString.includes('business') ||
      (metaErr.message && metaErr.message.toLowerCase().includes(businessId))
    ) {
      specificError = `Erro no Business ID: O Business ID '${businessId}' é inválido. Detalhe: ${specificError}`
    } else if (
      errorString.includes('invalid parameter') ||
      (metaErr.message && metaErr.message.toLowerCase().includes('invalid parameter'))
    ) {
      specificError = `Erro de Parâmetro Inválido: Verifique se o Pixel ID e Token estão corretos. Detalhe: ${specificError}`
    }

    await updateMetaCapiStatus(userId, specificError).catch(() => {})

    // Throw a more informative error that UI can use
    const newError = new Error(specificError) as any
    newError.response = error.response
    throw newError
  }
}
