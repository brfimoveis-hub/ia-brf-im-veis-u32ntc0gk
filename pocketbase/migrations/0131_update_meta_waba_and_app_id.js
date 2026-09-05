// Migration 0131: Atualiza os IDs Meta no usuário g5jto8bhulw01bz (brfimoveis@gmail.com):
// - meta_whatsapp_business_id = "4431901207057562" (WABA ativa/aprovada onde o número 1312411448618086 está registrado)
// - meta_app_id = "2442476629610638" (App publicado e conectado ao webhook)
// Mantém inalterados: meta_whatsapp_phone_number_id ("1312411448618086"),
// meta_whatsapp_verify_token ("BRF IA CRM"), access tokens, Instagram ID, etc.
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

    user.set('meta_whatsapp_business_id', '4431901207057562')
    user.set('meta_app_id', '2442476629610638')

    app.saveNoValidate(user)
    console.log(
      'Migration 0131: meta_whatsapp_business_id set to 4431901207057562 and meta_app_id set to 2442476629610638 for user',
      user.id,
    )
  },
  (app) => {
    try {
      const user = app.findRecordById('users', 'g5jto8bhulw01bz')
      user.set('meta_whatsapp_business_id', '1331365882438085')
      user.set('meta_app_id', '514693609145444')
      app.saveNoValidate(user)
    } catch (_) {}
  },
)
