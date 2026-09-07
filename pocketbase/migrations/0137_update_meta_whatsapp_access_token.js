// Migration 0137: Atualiza meta_whatsapp_access_token para o novo token gerado
// no Graph API Explorer ligado ao app "BRF Imóveis 2" (app_id 2442476629610638).
// Preserva intactos: meta_app_id, meta_whatsapp_business_id, meta_whatsapp_phone_number_id, meta_whatsapp_verify_token.

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
        console.log('[MIG_0137] Usuário não encontrado')
        return
      }
    }

    const newToken =
      'EAAita2fhUI4BSRBiDH2pZArNE12ZBW9DJ9ZBtzOmPUe5AyKAo5ImY85FbZBOUBV1ZANwboi9aZBoEazl4MJP4c5poCY7823yqOZCZCkZARiTIPLBnZB69ebRsTAhEcOC05U6UzFGpIliTE7tZAUxIYkZAZB72J3DkVwQLDta3FGG4EAYngLjjGKCNukZBDRXnnrm41hYgCCmWebSQOrEH0QV1lmxaFveCRlZCZC7cmHVpfvZArlYb7gnGhoZAiNXSCijPLb81WcLnbBFBZC86qh7JKcjZBzrZBgxt'

    // 1. Atualizar o token
    user.set('meta_whatsapp_access_token', newToken)
    user.set('meta_token_status', 'valid')
    app.saveNoValidate(user)

    const tokenMasked = newToken.substring(0, 6) + '...' + newToken.substring(newToken.length - 6)
    console.log(
      '[MIG_0137] meta_whatsapp_access_token atualizado para o usuário ' +
        user.id +
        ' (token: ' +
        tokenMasked +
        ')',
    )

    const wabaId = user.getString('meta_whatsapp_business_id') || '1727871165105009'
    const phoneId = user.getString('meta_whatsapp_phone_number_id') || '1324150594116725'

    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const initialLog = new Record(logsCol)
      initialLog.set('type', 'whatsapp_token_update')
      initialLog.set(
        'message',
        'Token do WhatsApp atualizado com sucesso para o usuário ' + user.id,
      )
      initialLog.set('user_id', user.id)
      initialLog.set(
        'payload',
        JSON.stringify({
          user_id: user.id,
          token_prefix: newToken.substring(0, 6),
          token_suffix: newToken.substring(newToken.length - 6),
          waba_id: wabaId,
          phone_number_id: phoneId,
          app_id: user.getString('meta_app_id'),
        }),
      )
      initialLog.set('details', 'Token atualizado via Migration 0137. Pronto para inscrição WABA.')
      app.save(initialLog)
    } catch (eLog) {
      console.log('[MIG_0137] Erro ao gravar log inicial: ' + (eLog.message || eLog))
    }
  },
  (app) => {
    // Reversão
  },
)
