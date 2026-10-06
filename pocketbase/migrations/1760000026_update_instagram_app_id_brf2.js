migrate(
  (app) => {
    // Atualiza o app do Instagram para "BRF Imóveis 2" (ID: 2442476629610638)
    // O app antigo 1121822660295492 foi deletado da Meta pelo cliente gerando "Aplicativo inativo".
    // O app "BRF Imóveis 2" já é o app ativo na Meta que roda a WABA e possui o secret d085b85d8d534c682f60b6bde8043610.
    const users = app.findRecordsByFilter('users', 'id != ""', '-created', 10, 0)
    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      const oldIgAppId = u.getString('meta_instagram_app_id') || ''
      const mainAppSecret = u.getString('meta_app_secret') || 'd085b85d8d534c682f60b6bde8043610'

      // Se estiver com o app deletado 1121822660295492 ou vazio, atualiza para 2442476629610638
      if (!oldIgAppId || oldIgAppId === '1121822660295492') {
        u.set('meta_instagram_app_id', '2442476629610638')
        // Sincroniza o secret com o secret do app "BRF Imóveis 2"
        u.set('meta_instagram_app_secret', mainAppSecret)
        app.saveNoValidate(u)
      }
    }
  },
  (app) => {
    // Reversão
    const users = app.findRecordsByFilter('users', 'id != ""', '-created', 10, 0)
    for (let i = 0; i < users.length; i++) {
      const u = users[i]
      if (u.getString('meta_instagram_app_id') === '2442476629610638') {
        u.set('meta_instagram_app_id', '1121822660295492')
        app.saveNoValidate(u)
      }
    }
  },
)
