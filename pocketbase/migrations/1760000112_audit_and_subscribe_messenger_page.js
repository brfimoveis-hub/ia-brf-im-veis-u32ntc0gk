// Migration 1760000112: Inspecionar e verificar subscribed_apps da página 1343797128806374 na Graph API
// App Meta ID esperado: 2442476629610638
// Página BRF Imóveis duplicada: 1343797128806374

migrate(
  (app) => {
    const pageId = '1343797128806374'
    const targetAppId = '2442476629610638'

    let user = null
    try {
      user = app.findFirstRecordByFilter('users', "email = 'brfimoveis@gmail.com'")
    } catch (_) {}

    if (!user) {
      try {
        const users = app.findRecordsByFilter('users', "email != ''", 'created', 1, 0)
        if (users && users.length > 0) user = users[0]
      } catch (_) {}
    }

    if (!user) {
      console.log('[MESSENGER_AUDIT] Nenhum usuário encontrado no CRM.')
      return
    }

    const pageToken = user.getString('meta_page_access_token') || ''
    const igPageToken = user.getString('meta_instagram_page_token') || ''
    const userToken = user.getString('meta_instagram_user_token') || ''
    const capiToken = user.getString('meta_capi_token') || ''
    const waToken = user.getString('meta_whatsapp_access_token') || ''

    const candidates = [
      { name: 'meta_page_access_token', token: pageToken },
      { name: 'meta_instagram_page_token', token: igPageToken },
      { name: 'meta_instagram_user_token', token: userToken },
      { name: 'meta_capi_token', token: capiToken },
      { name: 'meta_whatsapp_access_token', token: waToken },
    ].filter((c) => !!c.token)

    let auditResult = {
      page_id: pageId,
      target_app_id: targetAppId,
      timestamp: new Date().toISOString(),
      tokens_checked: candidates.map((c) => c.name),
      page_token_valid: false,
      page_token_name: '',
      page_details: null,
      subscribed_apps_before: null,
      subscribed_apps_after: null,
      action_taken: '',
      subscription_post_result: null,
      error: null,
    }

    // 1. Testar qual token tem acesso à página 1343797128806374
    let validToken = ''
    let validTokenSource = ''

    for (const c of candidates) {
      try {
        const res = $http.send({
          url: `https://graph.facebook.com/v22.0/${pageId}?fields=id,name,access_token,category&access_token=${encodeURIComponent(c.token)}`,
          method: 'GET',
          timeout: 15,
        })
        if (res.statusCode >= 200 && res.statusCode < 300 && res.json) {
          validToken = c.token
          validTokenSource = c.name
          auditResult.page_token_valid = true
          auditResult.page_token_name = c.name
          auditResult.page_details = res.json

          // Se a página retornou um access_token específico de página no GET /{pageId}?fields=access_token, usamos esse token específico!
          if (res.json.access_token) {
            validToken = res.json.access_token
            validTokenSource = `${c.name} (page-specific-token)`
          }
          break
        }
      } catch (err) {
        // continua testando os próximos tokens
      }
    }

    // Se nenhum token acessou diretamente por /{pageId}, testar GET /me/accounts para ver se a página está listada
    if (!validToken) {
      for (const c of candidates) {
        try {
          const accRes = $http.send({
            url: `https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token&access_token=${encodeURIComponent(c.token)}`,
            method: 'GET',
            timeout: 15,
          })
          if (
            accRes.statusCode >= 200 &&
            accRes.statusCode < 300 &&
            accRes.json &&
            accRes.json.data
          ) {
            const pages = accRes.json.data
            const match = pages.find((p) => String(p.id) === pageId)
            if (match && match.access_token) {
              validToken = match.access_token
              validTokenSource = `${c.name} -> me/accounts match`
              auditResult.page_token_valid = true
              auditResult.page_token_name = validTokenSource
              auditResult.page_details = { id: match.id, name: match.name }
              break
            }
          }
        } catch (_) {}
      }
    }

    if (!validToken) {
      auditResult.error =
        'Nenhum dos tokens armazenados em users tem acesso direto à página 1343797128806374.'
      console.log('[MESSENGER_AUDIT_ERROR] ' + auditResult.error)

      // Gravar nos system_logs para auditoria do CRM
      try {
        const sysLogsCol = app.findCollectionByNameOrId('system_logs')
        const logRec = new Record(sysLogsCol, {
          user_id: user.id,
          type: 'messenger_audit',
          message:
            'Auditoria de subscribed_apps do Messenger falhou: token da página ausente ou sem acesso',
          details: JSON.stringify(auditResult),
          payload: auditResult,
        })
        app.save(logRec)
      } catch (_) {}
      return
    }

    // 2. Chamar GET /{pageId}/subscribed_apps
    let isSubscribed = false
    let currentFields = []
    try {
      const getSubRes = $http.send({
        url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(validToken)}`,
        method: 'GET',
        timeout: 15,
      })

      auditResult.subscribed_apps_before = {
        statusCode: getSubRes.statusCode,
        json: getSubRes.json || getSubRes.body,
      }

      if (
        getSubRes.statusCode >= 200 &&
        getSubRes.statusCode < 300 &&
        getSubRes.json &&
        getSubRes.json.data
      ) {
        const apps = getSubRes.json.data || []
        const targetApp = apps.find(
          (a) =>
            String(a.id) === targetAppId ||
            String(a.whatsapp_business_api_data?.id) === targetAppId,
        )
        if (targetApp) {
          isSubscribed = true
          currentFields = targetApp.subscribed_fields || []
        }
      }
    } catch (errSub) {
      auditResult.error = `Erro ao consultar subscribed_apps: ${String(errSub)}`
    }

    // 3. Se NÃO estiver inscrito ou se o campo 'messages' não constar, fazer POST /{pageId}/subscribed_apps
    const hasMessages = currentFields.includes('messages')
    if (!isSubscribed || !hasMessages) {
      try {
        const postSubRes = $http.send({
          url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `subscribed_fields=messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads&access_token=${encodeURIComponent(validToken)}`,
          timeout: 20,
        })

        auditResult.action_taken =
          'Executado POST /{pageId}/subscribed_apps com subscribed_fields=messages'
        auditResult.subscription_post_result = {
          statusCode: postSubRes.statusCode,
          json: postSubRes.json || postSubRes.body,
        }

        // Consultar novamente após a inscrição
        const checkAfter = $http.send({
          url: `https://graph.facebook.com/v22.0/${pageId}/subscribed_apps?access_token=${encodeURIComponent(validToken)}`,
          method: 'GET',
          timeout: 15,
        })
        auditResult.subscribed_apps_after = {
          statusCode: checkAfter.statusCode,
          json: checkAfter.json || checkAfter.body,
        }
      } catch (postErr) {
        auditResult.error = `Erro no POST subscribed_apps: ${String(postErr)}`
      }
    } else {
      auditResult.action_taken =
        'App 2442476629610638 já está devidamente inscrito com o campo messages!'
      auditResult.subscribed_apps_after = auditResult.subscribed_apps_before
    }

    // Gravar resultado nos system_logs para consulta imediata via db_query
    try {
      const sysLogsCol = app.findCollectionByNameOrId('system_logs')
      const logRec = new Record(sysLogsCol, {
        user_id: user.id,
        type: 'messenger_audit',
        message: `Auditoria subscribed_apps Página ${pageId}: ${auditResult.action_taken || 'Concluída'}`,
        details: JSON.stringify(auditResult),
        payload: auditResult,
      })
      app.save(logRec)
    } catch (_) {}

    console.log('[MESSENGER_AUDIT_SUCCESS] ' + JSON.stringify(auditResult))
  },
  (app) => {
    // Reversão no-op
  },
)
