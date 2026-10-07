migrate(
  (app) => {
    const users = app.findRecordsByFilter(
      'users',
      'email = "brfimoveis@gmail.com"',
      '-created',
      1,
      0,
    )
    if (!users || users.length === 0) {
      console.log('[INSTAGRAM_APP_STATUS] Usuário brfimoveis@gmail.com não encontrado')
      return
    }
    const user = users[0]
    const appId = (user.getString('meta_instagram_app_id') || '2442476629610638').trim()
    const appSecret = (user.getString('meta_instagram_app_secret') || '').trim()
    const oauthUserTok = (user.getString('meta_instagram_user_token') || '').trim()
    const pageTok = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()

    const appToken = appId && appSecret ? appId + '|' + appSecret : ''

    console.log('[INSTAGRAM_APP_STATUS] === INICIANDO DIAGNÓSTICO GRAPH API v22.0 ===')
    console.log('[INSTAGRAM_APP_STATUS] App ID: ' + appId + ' | Secret presente: ' + !!appSecret)
    console.log(
      '[INSTAGRAM_APP_STATUS] User token presente: ' +
        !!oauthUserTok +
        ' | Page token presente: ' +
        !!pageTok,
    )

    const diagResults = {
      timestamp: new Date().toISOString(),
      app_id: appId,
      app_info: null,
      app_roles_with_app_token: null,
      app_roles_with_user_token: null,
      user_me_oauth: null,
      user_me_page: null,
      action_add_role_result: null,
      bernadete_user_id: null,
    }

    // 1. Diagnóstico do App com App Access Token (app_id|app_secret)
    if (appToken) {
      try {
        console.log(
          '[INSTAGRAM_APP_STATUS] Consultando GET /' +
            appId +
            '?fields=id,name,namespace,status,category,link,icon_url...',
        )
        const appRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '?fields=id,name,namespace,status,category,link,icon_url&access_token=' +
            encodeURIComponent(appToken),
          method: 'GET',
          timeout: 15,
        })
        diagResults.app_info = {
          status: appRes.statusCode,
          body: appRes.json,
        }
        console.log(
          '[INSTAGRAM_APP_STATUS] Resposta App Info: HTTP ' +
            appRes.statusCode +
            ' -> ' +
            JSON.stringify(appRes.json),
        )
      } catch (eApp) {
        console.log('[INSTAGRAM_APP_STATUS] Erro ao consultar App Info: ' + String(eApp))
        diagResults.app_info = { error: String(eApp) }
      }

      // Consulta roles com app token
      try {
        console.log('[INSTAGRAM_APP_STATUS] Consultando GET /' + appId + '/roles com app token...')
        const rolesRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '/roles?access_token=' +
            encodeURIComponent(appToken),
          method: 'GET',
          timeout: 15,
        })
        diagResults.app_roles_with_app_token = {
          status: rolesRes.statusCode,
          body: rolesRes.json,
        }
        console.log(
          '[INSTAGRAM_APP_STATUS] Resposta Roles (App Token): HTTP ' +
            rolesRes.statusCode +
            ' -> ' +
            JSON.stringify(rolesRes.json),
        )
      } catch (eRoles) {
        console.log(
          '[INSTAGRAM_APP_STATUS] Erro ao consultar Roles com App Token: ' + String(eRoles),
        )
        diagResults.app_roles_with_app_token = { error: String(eRoles) }
      }
    } else {
      console.log('[INSTAGRAM_APP_STATUS] App Token não pode ser derivado (secret ausente)')
      diagResults.app_info = { error: 'App Secret ausente' }
    }

    // 2. Consulta /me com o user token gravado
    if (oauthUserTok) {
      try {
        console.log('[INSTAGRAM_APP_STATUS] Consultando GET /me com user token...')
        const meRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me?fields=id,name,email&access_token=' +
            encodeURIComponent(oauthUserTok),
          method: 'GET',
          timeout: 15,
        })
        diagResults.user_me_oauth = {
          status: meRes.statusCode,
          body: meRes.json,
        }
        console.log(
          '[INSTAGRAM_APP_STATUS] Resposta /me (User Token): HTTP ' +
            meRes.statusCode +
            ' -> ' +
            JSON.stringify(meRes.json),
        )
      } catch (eMe) {
        console.log('[INSTAGRAM_APP_STATUS] Erro ao consultar /me com user token: ' + String(eMe))
        diagResults.user_me_oauth = { error: String(eMe) }
      }

      // Consulta roles com user token
      try {
        console.log('[INSTAGRAM_APP_STATUS] Consultando GET /' + appId + '/roles com user token...')
        const rolesUserRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            appId +
            '/roles?access_token=' +
            encodeURIComponent(oauthUserTok),
          method: 'GET',
          timeout: 15,
        })
        diagResults.app_roles_with_user_token = {
          status: rolesUserRes.statusCode,
          body: rolesUserRes.json,
        }
        console.log(
          '[INSTAGRAM_APP_STATUS] Resposta Roles (User Token): HTTP ' +
            rolesUserRes.statusCode +
            ' -> ' +
            JSON.stringify(rolesUserRes.json),
        )
      } catch (eRu) {
        console.log('[INSTAGRAM_APP_STATUS] Erro ao consultar Roles com User Token: ' + String(eRu))
        diagResults.app_roles_with_user_token = { error: String(eRu) }
      }
    }

    // Consulta /me com page token caso diferente
    if (pageTok && pageTok !== oauthUserTok) {
      try {
        console.log('[INSTAGRAM_APP_STATUS] Consultando GET /me com page token...')
        const mePgRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me?fields=id,name&access_token=' +
            encodeURIComponent(pageTok),
          method: 'GET',
          timeout: 15,
        })
        diagResults.user_me_page = {
          status: mePgRes.statusCode,
          body: mePgRes.json,
        }
        console.log(
          '[INSTAGRAM_APP_STATUS] Resposta /me (Page Token): HTTP ' +
            mePgRes.statusCode +
            ' -> ' +
            JSON.stringify(mePgRes.json),
        )
      } catch (eMePg) {
        diagResults.user_me_page = { error: String(eMePg) }
      }
    }

    // 3. Verificação do ID da Bernadete e tentativa de POST role
    // Conforme memória do projeto: "Plano B: admin secundário 100053924061859 faz o vínculo IG↔Página."
    // Vamos verificar se 100053924061859 é um perfil ou se existe outro ID em logs/banco.
    // Também podemos testar GET /100053924061859?fields=id,name com app token ou user token.
    const candidateBernadeteId = '100053924061859'
    let resolvedBernadeteId = null

    // Testa o perfil do candidato Bernadete
    if (candidateBernadeteId) {
      const probeTokens = [
        { label: 'app_token', tok: appToken },
        { label: 'oauth_user_token', tok: oauthUserTok },
      ]
      for (const pt of probeTokens) {
        if (!pt.tok) continue
        try {
          console.log(
            '[INSTAGRAM_APP_STATUS] Testando perfil Bernadete ID ' +
              candidateBernadeteId +
              ' com ' +
              pt.label +
              '...',
          )
          const bRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/' +
              candidateBernadeteId +
              '?fields=id,name&access_token=' +
              encodeURIComponent(pt.tok),
            method: 'GET',
            timeout: 10,
          })
          console.log(
            '[INSTAGRAM_APP_STATUS] Resposta GET /' +
              candidateBernadeteId +
              ' (' +
              pt.label +
              '): HTTP ' +
              bRes.statusCode +
              ' -> ' +
              JSON.stringify(bRes.json),
          )
          if (bRes.statusCode === 200 && bRes.json && bRes.json.id) {
            resolvedBernadeteId = bRes.json.id
            diagResults.bernadete_user_id = bRes.json
            break
          } else if (bRes.json && bRes.json.error) {
            diagResults.bernadete_probe_error = bRes.json.error
          }
        } catch (eB) {
          console.log(
            '[INSTAGRAM_APP_STATUS] Erro testando perfil Bernadete com ' +
              pt.label +
              ': ' +
              String(eB),
          )
        }
      }
    }

    // AÇÃO PONTUAL: Tentar adicionar como TESTER se temos o ID (ou se usamos candidateBernadeteId)
    // Conforme instrução: "POST https://graph.facebook.com/v22.0/2442476629610638/roles com user=<id_da_bernadete>&role=testers&access_token=<token de admin do app — use o user token do Mauro gravado no banco; se recusar, derive o app token app_id|secret e tente com ele>"
    const targetUserIdForRole = resolvedBernadeteId || candidateBernadeteId
    if (targetUserIdForRole) {
      console.log(
        '[INSTAGRAM_APP_STATUS] Tentando adicionar Bernadete (' +
          targetUserIdForRole +
          ') como tester...',
      )
      let roleAdded = false

      // Tentativa 1: User Token do Mauro (admin)
      if (oauthUserTok) {
        try {
          console.log('[INSTAGRAM_APP_STATUS] POST /roles com User Token do Mauro...')
          const postRes = $http.send({
            url: 'https://graph.facebook.com/v22.0/' + appId + '/roles',
            method: 'POST',
            data: {
              user: targetUserIdForRole,
              role: 'testers',
            },
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + oauthUserTok,
            },
            timeout: 15,
          })
          console.log(
            '[INSTAGRAM_APP_STATUS] Resposta POST /roles (User Token): HTTP ' +
              postRes.statusCode +
              ' -> ' +
              JSON.stringify(postRes.json),
          )
          diagResults.action_add_role_result = {
            attempt: 'user_token',
            status: postRes.statusCode,
            body: postRes.json,
          }
          if (postRes.statusCode >= 200 && postRes.statusCode < 300) {
            roleAdded = true
          }
        } catch (ePostU) {
          console.log('[INSTAGRAM_APP_STATUS] Erro POST /roles com User Token: ' + String(ePostU))
          diagResults.action_add_role_result = {
            attempt: 'user_token',
            error: String(ePostU),
          }
        }
      }

      // Tentativa 2: Se recusar ou falhar, tenta com App Token (app_id|secret)
      if (!roleAdded && appToken) {
        try {
          console.log('[INSTAGRAM_APP_STATUS] POST /roles com App Token (app_id|app_secret)...')
          const postAppRes = $http.send({
            url: 'https://graph.facebook.com/v22.0/' + appId + '/roles',
            method: 'POST',
            data: {
              user: targetUserIdForRole,
              role: 'testers',
              access_token: appToken,
            },
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 15,
          })
          console.log(
            '[INSTAGRAM_APP_STATUS] Resposta POST /roles (App Token): HTTP ' +
              postAppRes.statusCode +
              ' -> ' +
              JSON.stringify(postAppRes.json),
          )
          diagResults.action_add_role_app_token_result = {
            attempt: 'app_token',
            status: postAppRes.statusCode,
            body: postAppRes.json,
          }
        } catch (ePostA) {
          console.log('[INSTAGRAM_APP_STATUS] Erro POST /roles com App Token: ' + String(ePostA))
          diagResults.action_add_role_app_token_result = {
            attempt: 'app_token',
            error: String(ePostA),
          }
        }
      }
    } else {
      console.log(
        '[INSTAGRAM_APP_STATUS] ID numérico da Bernadete NÃO encontrado. Pulando POST /roles.',
      )
      diagResults.action_add_role_result = {
        skipped: true,
        reason: 'ID numérico da Bernadete não disponível',
      }
    }

    // Salvar em system_logs para auditoria completa e leitura imediata
    const logsCol = app.findCollectionByNameOrId('system_logs')
    const logRec = new Record(logsCol, {
      type: 'meta_instagram_app_diagnostic',
      message: 'Diagnóstico Completo App Meta ' + appId,
      payload: diagResults,
      details: JSON.stringify(diagResults).substring(0, 4000),
      user_id: user.id,
    })
    app.save(logRec)
    console.log(
      '[INSTAGRAM_APP_STATUS] Diagnóstico gravado com sucesso em system_logs id=' + logRec.id,
    )
  },
  (app) => {},
)
