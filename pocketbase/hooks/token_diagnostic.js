// pocketbase/hooks/token_diagnostic.js
// Rota para diagnóstico manual sob demanda do token Meta
routerAdd('GET', '/backend/v1/instagram/token-diagnostic', (e) => {
  const userRecords = $app.findRecordsByFilter('users', 'id != ""', '-created', 1, 0)
  if (!userRecords || userRecords.length === 0) {
    return e.json(404, { error: 'Nenhum usuário encontrado' })
  }
  const crmUser = userRecords[0]

  const igAppId = (
    crmUser.getString('meta_instagram_app_id') ||
    crmUser.getString('meta_app_id') ||
    '2442476629610638'
  ).trim()
  const metaAppSecret = (crmUser.getString('meta_app_secret') || '').trim()
  const metaIgAppSecret = (crmUser.getString('meta_instagram_app_secret') || '').trim()

  // Testa os dois secrets possíveis para montar appToken
  const secretCandidates = []
  if (metaAppSecret) secretCandidates.push(metaAppSecret)
  if (metaIgAppSecret && metaIgAppSecret !== metaAppSecret) secretCandidates.push(metaIgAppSecret)
  if (secretCandidates.indexOf('d085b85d8d534c682f60b6bde8043610') === -1) {
    secretCandidates.push('d085b85d8d534c682f60b6bde8043610')
  }
  if (secretCandidates.indexOf('248ee93aa36d2e85bef72379753a9083') === -1) {
    secretCandidates.push('248ee93aa36d2e85bef72379753a9083')
  }

  const igUserId = (crmUser.getString('meta_instagram_business_id') || '17841418593400936').trim()
  const pageId = (crmUser.getString('meta_page_id') || '1219427617930954').trim()
  const alternatePageId = '1343797128806374'

  function maskTok(t) {
    if (!t || typeof t !== 'string') return ''
    const tr = t.trim()
    if (tr.length <= 8) return '***'
    return tr.substring(0, 10) + '...' + tr.slice(-4)
  }

  const tokensToAudit = [
    {
      field: 'meta_instagram_user_token',
      token: (crmUser.getString('meta_instagram_user_token') || '').trim(),
    },
    {
      field: 'meta_instagram_page_token',
      token: (crmUser.getString('meta_instagram_page_token') || '').trim(),
    },
    {
      field: 'meta_page_access_token',
      token: (crmUser.getString('meta_page_access_token') || '').trim(),
    },
    {
      field: 'meta_capi_token',
      token: (crmUser.getString('meta_capi_token') || '').trim(),
    },
    {
      field: 'meta_whatsapp_access_token',
      token: (crmUser.getString('meta_whatsapp_access_token') || '').trim(),
    },
  ]

  const requiredScopes = [
    'instagram_manage_messages',
    'instagram_basic',
    'pages_messaging',
    'pages_manage_metadata',
    'pages_read_engagement',
    'business_management',
  ]

  const auditResults = []

  for (let i = 0; i < tokensToAudit.length; i++) {
    const item = tokensToAudit[i]
    const rawToken = item.token
    if (!rawToken) {
      auditResults.push({
        field: item.field,
        status: 'empty',
        token_masked: '',
      })
      continue
    }

    const tokenReport = {
      field: item.field,
      token_masked: maskTok(rawToken),
      token_length: rawToken.length,
      debug_token: null,
      entity_read_ig: null,
      entity_read_page: null,
      missing_scopes: [],
    }

    // 1. debug_token na Graph API testando com app access token e self token
    // Primeiramente tenta com cada candidate app secret
    let dbgData = null
    let dbgResLast = null

    for (let scIdx = 0; scIdx < secretCandidates.length; scIdx++) {
      const candidateAppToken = igAppId + '|' + secretCandidates[scIdx]
      try {
        const dbgRes = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(rawToken) +
            '&access_token=' +
            encodeURIComponent(candidateAppToken),
          method: 'GET',
          timeout: 10,
        })
        dbgResLast = dbgRes
        if (dbgRes.statusCode === 200 && dbgRes.json && dbgRes.json.data) {
          dbgData = dbgRes.json.data
          break
        }
      } catch (_) {}
    }

    // Se ainda não conseguiu, tenta com o próprio token como access_token
    if (!dbgData) {
      try {
        const selfDbgRes = $http.send({
          url:
            'https://graph.facebook.com/debug_token?input_token=' +
            encodeURIComponent(rawToken) +
            '&access_token=' +
            encodeURIComponent(rawToken),
          method: 'GET',
          timeout: 10,
        })
        if (selfDbgRes.statusCode === 200 && selfDbgRes.json && selfDbgRes.json.data) {
          dbgData = selfDbgRes.json.data
          dbgResLast = selfDbgRes
        }
      } catch (_) {}
    }

    // Se ainda não conseguiu, tenta GET /v22.0/me/permissions diretamente com o token
    let permsData = []
    try {
      const permRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
          encodeURIComponent(rawToken),
        method: 'GET',
        timeout: 10,
      })
      if (permRes.statusCode === 200 && permRes.json && Array.isArray(permRes.json.data)) {
        permsData = permRes.json.data
      }
    } catch (_) {}

    if (dbgData) {
      const scopes = Array.isArray(dbgData.scopes) ? dbgData.scopes : []
      const missing = []
      for (let s = 0; s < requiredScopes.length; s++) {
        const reqSc = requiredScopes[s]
        if (scopes.indexOf(reqSc) === -1) {
          missing.push(reqSc)
        }
      }
      tokenReport.missing_scopes = missing

      let expiresFormatted = 'never (perennial / system user)'
      if (dbgData.expires_at && dbgData.expires_at > 0) {
        expiresFormatted = new Date(dbgData.expires_at * 1000).toISOString()
      }

      tokenReport.debug_token = {
        http_status: dbgResLast ? dbgResLast.statusCode : 200,
        is_valid: Boolean(dbgData.is_valid),
        type: dbgData.type || 'unknown',
        app_id: dbgData.app_id || '',
        application: dbgData.application || '',
        expires_at_raw: dbgData.expires_at || 0,
        expires_at_formatted: expiresFormatted,
        data_access_expires_at: dbgData.data_access_expires_at || 0,
        user_id: dbgData.user_id || '',
        profile_id: dbgData.profile_id || '',
        granular_scopes: dbgData.granular_scopes || [],
        scopes: scopes,
      }

      console.log(
        `[IG_TOKEN_DEBUG] Field: ${item.field} | Valid: ${dbgData.is_valid} | Type: ${dbgData.type} | App: ${dbgData.app_id} | Expires: ${expiresFormatted} | Scopes (${scopes.length}): [${scopes.join(', ')}] | Missing: [${missing.join(', ')}]`,
      )
    } else {
      tokenReport.debug_token = {
        http_status: dbgResLast ? dbgResLast.statusCode : 400,
        error: dbgResLast ? dbgResLast.json || dbgResLast.body : 'unknown',
        permissions_fallback: permsData,
      }
      console.warn(
        `[IG_TOKEN_DEBUG] Field: ${item.field} debug_token falhou: status=${dbgResLast ? dbgResLast.statusCode : 'none'} res=${JSON.stringify(dbgResLast ? dbgResLast.json || dbgResLast.body : '')} permissions=${JSON.stringify(permsData)}`,
      )
    }

    // 2. Leitura da entidade Instagram GET /v22.0/{igUserId}?fields=name,username
    try {
      const igRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          encodeURIComponent(igUserId) +
          '?fields=name,username&access_token=' +
          encodeURIComponent(rawToken),
        method: 'GET',
        timeout: 10,
      })
      tokenReport.entity_read_ig = {
        target_id: igUserId,
        http_status: igRes.statusCode,
        success: igRes.statusCode >= 200 && igRes.statusCode < 300,
        data: igRes.json || igRes.body,
      }
      console.log(
        `[IG_TOKEN_DEBUG] Field: ${item.field} Read IG /${igUserId}: status=${igRes.statusCode} data=${JSON.stringify(igRes.json || '')}`,
      )
    } catch (errIg) {
      tokenReport.entity_read_ig = { error: String(errIg) }
    }

    // 3. Leitura da Página GET /v22.0/{pageId}?fields=name e alternatePageId
    try {
      const pgRes = $http.send({
        url:
          'https://graph.facebook.com/v22.0/' +
          encodeURIComponent(pageId) +
          '?fields=name,id&access_token=' +
          encodeURIComponent(rawToken),
        method: 'GET',
        timeout: 10,
      })

      let altPgRes = null
      try {
        altPgRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(alternatePageId) +
            '?fields=name,id&access_token=' +
            encodeURIComponent(rawToken),
          method: 'GET',
          timeout: 10,
        })
      } catch (_) {}

      tokenReport.entity_read_page = {
        target_id: pageId,
        http_status: pgRes.statusCode,
        success: pgRes.statusCode >= 200 && pgRes.statusCode < 300,
        data: pgRes.json || pgRes.body,
        alternate_page: {
          target_id: alternatePageId,
          http_status: altPgRes ? altPgRes.statusCode : null,
          success: altPgRes ? altPgRes.statusCode >= 200 && altPgRes.statusCode < 300 : false,
          data: altPgRes ? altPgRes.json || altPgRes.body : null,
        },
      }
      console.log(
        `[IG_TOKEN_DEBUG] Field: ${item.field} Read Page /${pageId}: status=${pgRes.statusCode} | Alt Page /${alternatePageId}: status=${altPgRes ? altPgRes.statusCode : 'none'}`,
      )
    } catch (errPg) {
      tokenReport.entity_read_page = { error: String(errPg) }
    }

    auditResults.push(tokenReport)
  }

  // Salvar auditoria consolidada no system_logs
  try {
    const logsCol = $app.findCollectionByNameOrId('system_logs')
    const auditLog = new Record(logsCol)
    auditLog.set('user_id', crmUser.id)
    auditLog.set('type', 'instagram_token_debug_audit')
    auditLog.set(
      'message',
      `Auditoria [IG_TOKEN_DEBUG] executada para ${tokensToAudit.length} tokens. App: ${igAppId}. IG Target: ${igUserId}. Page Target: ${pageId}.`,
    )
    auditLog.set(
      'payload',
      JSON.stringify({
        app_id: igAppId,
        ig_user_id: igUserId,
        page_id: pageId,
        results: auditResults,
      }),
    )
    $app.saveNoValidate(auditLog)
    console.log('[IG_TOKEN_DEBUG] Auditoria consolidada salva com sucesso em system_logs.')
  } catch (saveErr) {
    console.warn(`[IG_TOKEN_DEBUG] Falha ao salvar em system_logs: ${String(saveErr)}`)
  }

  return e.json(200, {
    success: true,
    timestamp: new Date().toISOString(),
    app_id: igAppId,
    ig_user_id: igUserId,
    page_id: pageId,
    results: auditResults,
  })
})
