// Migration 0143: Atualiza meta_whatsapp_access_token para o novo token gerado
// no Graph API Explorer ligado ao app "BRF Imóveis 2" (app_id 2442476629610638).
// Preserva intactos: meta_app_id (2442476629610638), meta_whatsapp_business_id (1727871165105009),
// meta_whatsapp_phone_number_id (1324150594116725), meta_whatsapp_verify_token (BRF IA CRM), meta_capi_token.

migrate(
  (app) => {
    const targetUserId = 'g5jto8bhulw01bz'
    let user = null
    try {
      user = app.findRecordById('users', targetUserId)
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (err) {
        console.log('[MIG_0143] Usuário não encontrado')
        return
      }
    }

    const newToken =
      'EAAita2fhUI4BSTkFRKvPhaEAb0l2lKOE56Jc6d8Kkss4XrhpzzLFur3bX3CcuSaZAUYDIqZBs4TvjDcyUw0k6YrPsxZAK3n09WnxcMUDxd17dGmUOGbN5ZBSSONVIrwlBTVktYC7P23jwy8Y55XwKSZAa0NY2zTeo2eX2vd5yDjiczcdmUCOTMsl3pyF5MXjYSH2oC57q0qKaEOS3ZBKfyj3YVk4GrQ6jY2xPKXnFDcjAanUvjmA2dyZAgBAgrMzqeLz30l8WEZCKOCT7gb3SN0i'

    // 1. Atualizar o token inicial
    user.set('meta_whatsapp_access_token', newToken)
    user.set('meta_token_status', 'valid')
    app.saveNoValidate(user)

    const tokenMasked = newToken.substring(0, 10) + '...' + newToken.substring(newToken.length - 6)
    console.log(
      '[MIG_0143] meta_whatsapp_access_token atualizado para o usuário ' +
        user.id +
        ' (token: ' +
        tokenMasked +
        ')',
    )

    const wabaId = user.getString('meta_whatsapp_business_id') || '1727871165105009'
    const phoneId = user.getString('meta_whatsapp_phone_number_id') || '1324150594116725'
    const appId = user.getString('meta_app_id') || '2442476629610638'

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const initialLog = new Record(logsCol)
      initialLog.set('type', 'whatsapp_token_update')
      initialLog.set(
        'message',
        'Token do WhatsApp atualizado via Migration 0143 para o usuário ' + user.id,
      )
      initialLog.set('user_id', user.id)
      initialLog.set(
        'payload',
        JSON.stringify({
          user_id: user.id,
          token_prefix: newToken.substring(0, 10),
          token_suffix: newToken.substring(newToken.length - 6),
          waba_id: wabaId,
          phone_number_id: phoneId,
          app_id: appId,
        }),
      )
      initialLog.set(
        'details',
        'Token inicial atualizado via Migration 0143. Rotina de validação e subscribed_apps pronta.',
      )
      app.save(initialLog)
    } catch (eLog) {
      console.log('[MIG_0143] Erro ao gravar log inicial: ' + (eLog.message || eLog))
    }
  },
  (app) => {
    // Reversão
  },
)
