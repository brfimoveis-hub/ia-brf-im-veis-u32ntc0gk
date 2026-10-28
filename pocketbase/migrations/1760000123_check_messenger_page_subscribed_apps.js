// Migration 1760000123: Verificação de inscrição do Messenger GET /{pageId}/subscribed_apps
// Executa a chamada com o token da página (users.meta_page_access_token) e grava em system_logs com tipo 'messenger_subscription_check'
// Defensivo: se falhar, grava o erro exato sem quebrar a migration/deploy.
migrate(
  (app) => {
    const pageId = '1343797128806374'
    const sysLogsCol = app.findCollectionByNameOrId('system_logs')

    let user = null
    try {
      user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    } catch (_) {}

    if (!user) {
      try {
        const users = app.findRecordsByFilter(
          'users',
          "meta_page_access_token != ''",
          'created',
          1,
          0,
        )
        if (users && users.length > 0) user = users[0]
      } catch (_) {}
    }

    if (!user) {
      const errRec = new Record(sysLogsCol, {
        type: 'messenger_subscription_check',
        message: 'Usuário com meta_page_access_token não encontrado',
        details: 'Nenhum usuário localizado para obter o token da Página 1343797128806374',
        payload: { success: false, error: 'user_not_found' },
      })
      app.save(errRec)
      return
    }

    const pageToken = (user.getString('meta_page_access_token') || '').trim()
    if (!pageToken) {
      const errRec = new Record(sysLogsCol, {
        user_id: user.id,
        type: 'messenger_subscription_check',
        message: 'Token de acesso à página (meta_page_access_token) vazio',
        details: 'Campo meta_page_access_token vazio no usuário ' + user.id,
        payload: { success: false, error: 'empty_meta_page_access_token' },
      })
      app.save(errRec)
      return
    }

    const nowIso = new Date().toISOString()
    let getRes = null
    let responseBody = null
    let statusCode = 0
    let fetchError = null

    try {
      getRes = $http.send({
        url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(pageToken)}`,
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        timeout: 20,
      })
      statusCode = getRes ? getRes.statusCode : 0
      responseBody = getRes ? getRes.json || getRes.body || {} : null
    } catch (err) {
      fetchError = String(err)
    }

    let summaryMsg = ''
    let subscribedFields = []
    let isSuccess = statusCode >= 200 && statusCode < 300

    if (isSuccess && responseBody && responseBody.data) {
      // responseBody.data é um array de apps com seus campos inscritos, ex:
      // [{ "category": "...", "link": "...", "name": "...", "id": "...", "subscribed_fields": ["messages", ...] }]
      const apps = responseBody.data || []
      const foundFields = []
      apps.forEach((appItem) => {
        if (appItem.subscribed_fields) {
          foundFields.push(...appItem.subscribed_fields)
        }
      })
      subscribedFields = foundFields
      summaryMsg =
        `GET /${pageId}/subscribed_apps [${statusCode}]: ` +
        (subscribedFields.length > 0
          ? `Campos inscritos (${subscribedFields.length}): ${subscribedFields.join(', ')}`
          : 'Nenhum campo inscrito retornado em data')
    } else if (responseBody && responseBody.error) {
      const metaErr = responseBody.error
      summaryMsg = `GET /${pageId}/subscribed_apps erro [${statusCode}]: ${metaErr.message || 'Erro desconhecido'} (código ${metaErr.code || 'N/A'}, tipo ${metaErr.type || 'N/A'})`
    } else if (fetchError) {
      summaryMsg = `GET /${pageId}/subscribed_apps exceção de rede: ${fetchError}`
    } else {
      summaryMsg = `GET /${pageId}/subscribed_apps status ${statusCode}`
    }

    const checkLog = new Record(sysLogsCol, {
      user_id: user.id,
      type: 'messenger_subscription_check',
      message: summaryMsg,
      details: JSON.stringify({
        page_id: pageId,
        status_code: statusCode,
        timestamp: nowIso,
        response: responseBody,
        subscribed_fields: subscribedFields,
        error: fetchError || (responseBody && responseBody.error ? responseBody.error : null),
      }),
      payload: {
        page_id: pageId,
        status_code: statusCode,
        timestamp: nowIso,
        response: responseBody,
        subscribed_fields: subscribedFields,
        is_success: isSuccess,
      },
    })
    app.save(checkLog)
  },
  (app) => {},
)
