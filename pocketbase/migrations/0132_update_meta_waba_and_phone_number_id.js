// Migration 0132: Atualiza os identificadores Meta do usuário g5jto8bhulw01bz (brfimoveis@gmail.com)
// O número +55 48 9209-8050 foi registrado definitivamente pelo cliente na nova WABA (1727871165105009)
// com o ID do número de telefone 1324150594116725 (confirmado via WhatsApp Manager).
// Mantém inalterados todos os demais campos (meta_whatsapp_verify_token, meta_whatsapp_access_token, meta_app_id, etc.).
migrate(
  (app) => {
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (err) {
        console.log('User g5jto8bhulw01bz / brfimoveis@gmail.com not found, skipping update')
        return
      }
    }

    // 1. Atualizar WABA ID nova
    user.set('meta_whatsapp_business_id', '1727871165105009')

    // 2. Atualizar Phone Number ID exibido no WhatsApp Manager
    user.set('meta_whatsapp_phone_number_id', '1324150594116725')

    // 3. Garantir verify token "BRF IA CRM" caso esteja vazio
    const currentVerifyToken = user.getString('meta_whatsapp_verify_token') || ''
    if (!currentVerifyToken) {
      user.set('meta_whatsapp_verify_token', 'BRF IA CRM')
    }

    app.saveNoValidate(user)
    console.log(
      'Migration 0132: meta_whatsapp_business_id set to 1727871165105009 and meta_whatsapp_phone_number_id set to 1324150594116725 for user',
      user.id,
    )
  },
  (app) => {
    try {
      let user = null
      try {
        user = app.findRecordById('users', 'g5jto8bhulw01bz')
      } catch (_) {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      }
      if (user) {
        // Reverter para os valores anteriores da migration 0130 / 0131
        user.set('meta_whatsapp_business_id', '4431901207057562')
        user.set('meta_whatsapp_phone_number_id', '1312411448618086')
        app.saveNoValidate(user)
      }
    } catch (_) {}
  },
)
