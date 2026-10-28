// Migration 1760000115: Salvar o page access token oficial da página 1343797128806374 no usuário
migrate(
  (app) => {
    const pageId = '1343797128806374'
    const user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    if (!user) return

    const existingToken = user.getString('meta_page_access_token')
    if (!existingToken) return

    // Buscar access_token específico da página
    const res = $http.send({
      url: `https://graph.facebook.com/v22.0/${pageId}?fields=id,name,access_token&access_token=${encodeURIComponent(existingToken)}`,
      method: 'GET',
      timeout: 15,
    })

    if (res.statusCode === 200 && res.json && res.json.access_token) {
      const pageSpecificToken = res.json.access_token
      user.set('meta_page_access_token', pageSpecificToken)
      app.save(user)

      // Testar GET subscribed_apps e POST /me/messages simulado/dry-run com esse token específico de página
      const subRes = $http.send({
        url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageSpecificToken)}`,
        method: 'GET',
        timeout: 15,
      })

      const sysLogsCol = app.findCollectionByNameOrId('system_logs')
      const r = new Record(sysLogsCol, {
        user_id: user.id,
        type: 'messenger_page_token_saved',
        message:
          'Page Access Token específico de 1343797128806374 atualizado em users.meta_page_access_token',
        details: JSON.stringify({
          page_id: pageId,
          page_name: res.json.name,
          subscribed_apps_status: subRes.statusCode,
          subscribed_apps_body: subRes.json || subRes.body,
        }),
      })
      app.save(r)
    }
  },
  (app) => {},
)
