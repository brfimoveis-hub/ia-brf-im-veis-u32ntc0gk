// Atualiza APENAS as credenciais do WhatsApp (Phone Number ID, WhatsApp
// Business Account ID e token de acesso) para os novos valores descobertos
// no Facebook Developer Portal (app 514693609145444). Não toca em
// CAPI/Pixel/Instagram/Messenger. Também reseta o meta_token_status para que
// o novo token seja revalidado no próximo teste de conexão.
migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')

      user.set('meta_whatsapp_phone_number_id', '1190469747488797')
      user.set('meta_whatsapp_business_id', '1331365882438085')
      user.set(
        'meta_whatsapp_access_token',
        'EAAHUHHG9xGQBO0AE5m7gEk81r40AmAAmEZCChbPZBbHIgOTZBJrVcyZBZBZCTb43rNdW6ZC0R1PZBZA6ZBR8Tq1ZBdBAvSGabU1NpZCZA1v3fLsgiGQ4F0vO2YAqJGfAZCQhK1TilmQl2MlLZBuNA2ONQDEqWZCQoUfMOouyX8ocYbYUko0mquZBd6lRg0hhmkw3ouu69FrBhvVeiRfZCq0ZD',
      )
      // Reset the token validation status so the badge reflects an untested
      // (new) token until a connection test is run again.
      user.set('meta_token_status', '')

      app.saveNoValidate(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping WhatsApp credentials update')
    }
  },
  (app) => {
    // No-op revert: credentials are not safely reversible (the previous token
    // is superseded). Rollback would require the original token, which is not
    // available here.
  },
)
