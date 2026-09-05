// Migration 0130: Atualiza o WhatsApp Phone Number ID oficial (+55 48 99209-8050)
// para 1312411448618086 no usuário g5jto8bhulw01bz (brfimoveis@gmail.com).
// Verifica também se verify token e WABA ID estão corretos.
// Se a WABA ID estiver vazia, preenche com 4431901207057562.
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

    // 1. Atualizar Phone Number ID oficial
    user.set('meta_whatsapp_phone_number_id', '1312411448618086')

    // 2. Garantir verify token "BRF IA CRM" se vazio
    const currentVerifyToken = user.getString('meta_whatsapp_verify_token') || ''
    if (!currentVerifyToken) {
      user.set('meta_whatsapp_verify_token', 'BRF IA CRM')
    }

    // 3. Garantir WABA ID se vazia (meta_whatsapp_business_id)
    const currentBusinessId = user.getString('meta_whatsapp_business_id') || ''
    if (!currentBusinessId) {
      user.set('meta_whatsapp_business_id', '4431901207057562')
    }

    // 4. Garantir Meta App ID se vazio
    const currentAppId = user.getString('meta_app_id') || ''
    if (!currentAppId) {
      user.set('meta_app_id', '2442476629610638')
    }

    app.saveNoValidate(user)
    console.log(
      'Migration 0130: meta_whatsapp_phone_number_id updated to 1312411448618086 for user',
      user.id,
    )
  },
  (app) => {
    try {
      const user = app.findRecordById('users', 'g5jto8bhulw01bz')
      // Reverter para o ID anterior se necessário
      user.set('meta_whatsapp_phone_number_id', '1190469747488797')
      app.saveNoValidate(user)
    } catch (_) {}
  },
)
