// Migration 0163: Atualiza WABA e Phone Number ID do usuário Mauro para a conta onde o número já está registrado e CONNECTED
// meta_whatsapp_business_id: 3542548689255402
// meta_whatsapp_phone_number_id: 1239571259250639
// meta_token_status: active
// meta_whatsapp_status: +55 48 9209-8050
migrate(
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      try {
        user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {
        return
      }
    }

    user.set('meta_whatsapp_business_id', '3542548689255402')
    user.set('meta_whatsapp_phone_number_id', '1239571259250639')
    user.set('meta_token_status', 'active')
    user.set('meta_whatsapp_status', '+55 48 9209-8050')
    app.saveNoValidate(user)

    const logsCol = app.findCollectionByNameOrId('system_logs')
    const log = new Record(logsCol)
    log.set('type', 'whatsapp_credentials_migrated')
    log.set(
      'message',
      'Migration 0163: Updated user to WABA 3542548689255402 and phone_number_id 1239571259250639 (CONNECTED, VERIFIED, GREEN)',
    )
    log.set('user_id', user.id)
    log.set(
      'payload',
      JSON.stringify({
        meta_whatsapp_business_id: '3542548689255402',
        meta_whatsapp_phone_number_id: '1239571259250639',
        meta_token_status: 'active',
        meta_whatsapp_status: '+55 48 9209-8050',
      }),
    )
    app.save(log)
  },
  (app) => {
    let user = null
    try {
      user = app.findFirstRecordByData('users', 'id', 'g5jto8bhulw01bz')
    } catch (_) {
      return
    }
    user.set('meta_whatsapp_business_id', '1727871165105009')
    user.set('meta_whatsapp_phone_number_id', '1324150594116725')
    app.saveNoValidate(user)
  },
)
