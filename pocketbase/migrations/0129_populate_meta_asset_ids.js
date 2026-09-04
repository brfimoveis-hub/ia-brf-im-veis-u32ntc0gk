// Migration 0129: Popula os IDs de ativos oficiais da Meta informados pelo cliente
// no registro do usuário admin brfimoveis (id g5jto8bhulw01bz).
//
// Ativos Meta:
// - Instagram @mauro.brfimoveis (ID 17841408475954541) -> meta_instagram_business_id
// - Nota: O schema atual da coleção users possui:
//     * meta_instagram_business_id (ID da conta Instagram Business)
//     * meta_instagram_page_token / meta_page_access_token (Tokens de acesso da página)
//   Não existem campos dedicados como meta_facebook_page_id ou meta_business_portfolio_id
//   no schema atual da coleção users.
//
// Regras estritas:
// - Apenas popula campos vazios.
// - NÃO altera ou zera tokens existentes (WhatsApp, CAPI, etc.).
// - NÃO adiciona nenhum token novo (o cliente irá gerar o token permanente do System User).
migrate(
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')

      // 1. Popula meta_instagram_business_id caso esteja vazio
      const currentIgId = user.getString('meta_instagram_business_id') || ''
      if (!currentIgId) {
        user.set('meta_instagram_business_id', '17841408475954541')
      }

      // 2. Se o username do Instagram estiver vazio, garante o handle correto
      const currentIgUser = user.getString('instagram_username') || ''
      if (!currentIgUser) {
        user.set('instagram_username', 'mauro.brfimoveis')
      }

      app.saveNoValidate(user)
      console.log('Migration 0129: meta_instagram_business_id populado para brfimoveis@gmail.com')
    } catch (err) {
      console.log('brfimoveis@gmail.com not found, skipping meta asset ids populate:', err)
    }
  },
  (app) => {
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      if (user.getString('meta_instagram_business_id') === '17841408475954541') {
        user.set('meta_instagram_business_id', '')
        app.saveNoValidate(user)
      }
    } catch (_) {}
  },
)
