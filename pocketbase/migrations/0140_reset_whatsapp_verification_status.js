// Migration 0140: Atualiza meta_token_status e meta_whatsapp_status para o usuário
// g5jto8bhulw01bz após remoção do appsecret_proof inválido na verificação da API.

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
        console.log('[MIG_0140] Usuário não encontrado')
        return
      }
    }

    user.set('meta_token_status', 'active')
    // Atualiza status do WhatsApp se vazio
    if (!user.getString('meta_whatsapp_status')) {
      user.set('meta_whatsapp_status', 'connected')
    }
    app.saveNoValidate(user)

    console.log('[MIG_0140] Status do WhatsApp atualizado para active para usuário ' + user.id)
  },
  (app) => {
    // Reversão opcional
  },
)
