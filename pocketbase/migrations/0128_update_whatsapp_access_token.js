// Atualiza APENAS o token de acesso do WhatsApp Cloud API para o novo token
// permanente gerado pelo System User "Mauro" (ID 61589968903344) no app BRF
// Imóveis (514693609145444), com permissões whatsapp_business_messaging e
// whatsapp_business_management. Phone Number ID (1190469747488797) e WhatsApp
// Business ID (1331365882438085) já estão corretos — apenas o token rotacionou.
// Reseta o meta_token_status para que o novo token seja revalidado no próximo
// teste de conexão ("Testar Conexão") na página /settings/connections.
migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')

      user.set(
        'meta_whatsapp_access_token',
        'EAAHUHHG9xGQBSR8tCaVa18d7G8hQksZAbIZC12zsZBhsXkVPM9MY6j0zhM41ddrWAVi6Lp1ZCQUBxCNXrJqPAaoNoTLJa9SLiOOQNU4mVX6lY53BHSytBc5WrHeZCXbvcVhN8ioERKnSMZClNpq7WzwGh5hY4SH7cmCV7jkUM9KWDIF34C0WhZB0we9Jaa2hAZDZD',
      )
      // Reset the token validation status so the badge reflects an untested
      // (new) token until a connection test is run again.
      user.set('meta_token_status', '')

      app.saveNoValidate(user)
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping WhatsApp access token update')
    }
  },
  (app) => {
    // No-op revert: the previous token is superseded and not safely reversible.
  },
)
