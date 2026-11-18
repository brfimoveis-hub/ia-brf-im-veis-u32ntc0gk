routerAdd(
  'POST',
  '/backend/v1/instagram/test_connection',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) {
      return e.unauthorizedError('auth required')
    }

    var user = null
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {
      return e.badRequestError('Usuário não encontrado')
    }

    var igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var pageTokenCandidate = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var sysUserToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    var capiToken = (user.getString('meta_capi_token') || '').trim()

    var igToken = pageTokenCandidate || oauthUserToken || sysUserToken || capiToken
    var tokenSource = pageTokenCandidate
      ? 'page_token'
      : oauthUserToken
        ? 'oauth_user_token'
        : sysUserToken
          ? 'system_user_token'
          : capiToken
            ? 'capi_token'
            : 'nenhum'

    var igAppId = (
      user.getString('meta_instagram_app_id') ||
      user.getString('meta_app_id') ||
      '2442476629610638'
    ).trim()

    var TARGET_CRM_USERNAME = 'brf_imoveis_'

    function maskToken(tok) {
      if (!tok || typeof tok !== 'string') return ''
      var trimmed = tok.trim()
      if (trimmed.length <= 4) return '***'
      return '...' + trimmed.slice(-4)
    }

    var readAppCreds = function () {
      var appId = ''
      var appSecret = ''
      try {
        appId = (user.getString('meta_app_id') || '').trim()
        appSecret = (user.getString('meta_app_secret') || '').trim()
        if (!appId || !appSecret) {
          appId = appId || (user.getString('meta_instagram_app_id') || '').trim()
          appSecret = appSecret || (user.getString('meta_instagram_app_secret') || '').trim()
        }
      } catch (_) {}
      if (!appId || !appSecret) {
        try {
          appId = appId || String($os.getenv('META_APP_ID') || '').trim()
          appSecret = appSecret || String($os.getenv('META_APP_SECRET') || '').trim()
        } catch (_) {}
      }
      return { id: appId, secret: appSecret }
    }

    var proofParam = function (accessToken) {
      if (!accessToken) return ''
      var creds = readAppCreds()
      if (!creds || !creds.secret) return ''
      try {
        return '&appsecret_proof=' + $security.hs256(String(accessToken), creds.secret)
      } catch (_) {
        return ''
      }
    }

    function extractGraphError(resJson, httpStatus) {
      var errObj = (resJson && resJson.error) || {}
      return {
        http_status: httpStatus || 0,
        message: errObj.message || (resJson && resJson.error_message) || 'HTTP ' + httpStatus,
        code: typeof errObj.code === 'number' ? errObj.code : errObj.code || null,
        subcode:
          typeof errObj.error_subcode === 'number'
            ? errObj.error_subcode
            : errObj.error_subcode || null,
        user_msg: errObj.error_user_msg || errObj.error_user_title || null,
        type: errObj.type || null,
      }
    }

    if (!igToken && !igBizId) {
      return e.json(200, {
        success: false,
        status: 'not_configured',
        message: 'Instagram não configurado no CRM (nenhum token ou ID encontrado).',
        instructions: 'Conecte via OAuth ou informe o Page Access Token nas configurações.',
      })
    }

    var tokenIdentity = null
    var testedTokens = []

    // Passo 0: Testa /me com o token principal
    if (igToken) {
      try {
        var meRes = $http.send({
          url: 'https://graph.facebook.com/v22.0/me?fields=id,name' + proofParam(igToken),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + igToken },
          timeout: 12,
        })
        if (meRes.statusCode >= 200 && meRes.statusCode < 300 && meRes.json) {
          tokenIdentity = {
            id: String(meRes.json.id || ''),
            name: String(meRes.json.name || ''),
            type: 'user_or_page',
            http_status: meRes.statusCode,
          }
          testedTokens.push({
            type: tokenSource,
            token_suffix: maskToken(igToken),
            status: 'ok',
            http_status: meRes.statusCode,
          })
        } else {
          var meErr = extractGraphError(meRes.json, meRes.statusCode)
          tokenIdentity = {
            error: meErr,
            http_status: meRes.statusCode,
          }
          testedTokens.push({
            type: tokenSource,
            token_suffix: maskToken(igToken),
            status: 'failed',
            http_status: meRes.statusCode,
            graph_error: meErr,
          })
        }
      } catch (meNetErr) {
        var netErrObj = {
          http_status: 0,
          message:
            'Erro de rede ao validar token: ' +
            String(meNetErr && meNetErr.message ? meNetErr.message : meNetErr),
        }
        tokenIdentity = { error: netErrObj, http_status: 0 }
        testedTokens.push({
          type: tokenSource,
          token_suffix: maskToken(igToken),
          status: 'network_error',
          graph_error: netErrObj,
        })
      }
    }

    // Se temos um ID de negócio do Instagram, consulta diretamente o nó
    if (igBizId && igToken) {
      try {
        var igRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            encodeURIComponent(igBizId) +
            '?fields=id,name,username,profile_picture_url' +
            proofParam(igToken),
          method: 'GET',
          headers: { Authorization: 'Bearer ' + igToken },
          timeout: 12,
        })
        if (igRes.statusCode >= 200 && igRes.statusCode < 300 && igRes.json) {
          var d = igRes.json
          var igName = d.username || d.name || ''
          return e.json(200, {
            success: true,
            status: 'connected',
            message: 'Conectado ✅' + (igName ? ' — @' + igName : '') + ' (ID: ' + igBizId + ')',
            data: {
              id: String(d.id || igBizId),
              name: d.name || '',
              username: d.username || '',
            },
            instagram_business_id: igBizId,
            token_source: tokenSource,
            has_oauth_token: !!oauthUserToken,
            token_identity: tokenIdentity,
            tested_tokens: testedTokens,
            app_id: igAppId,
          })
        }
      } catch (_) {}
    }

    // Se /me foi bem-sucedido
    if (tokenIdentity && !tokenIdentity.error) {
      return e.json(200, {
        success: true,
        status: 'connected',
        message:
          'Token validado com sucesso na Meta (' + (tokenIdentity.name || tokenIdentity.id) + ').',
        token_identity: tokenIdentity,
        token_source: tokenSource,
        has_oauth_token: !!oauthUserToken,
        tested_tokens: testedTokens,
        app_id: igAppId,
      })
    }

    // Se o token falhou
    var lastGraphError = tokenIdentity && tokenIdentity.error ? tokenIdentity.error : null
    var isExpired =
      lastGraphError && (lastGraphError.code === 190 || lastGraphError.http_status === 401)

    return e.json(200, {
      success: false,
      status: isExpired ? 'expired' : 'configured_waiting_token',
      message: lastGraphError
        ? 'Erro Meta Graph API: ' + lastGraphError.message
        : 'Token do Instagram pendente ou não validado.',
      instructions:
        'Cole o System User Token ou gere um novo token no Graph API Explorer e clique em Salvar e Assinar.',
      token_source: tokenSource,
      has_oauth_token: !!oauthUserToken,
      graph_error: lastGraphError,
      token_identity: tokenIdentity,
      tested_tokens: testedTokens,
      app_id: igAppId,
    })
  },
  $apis.requireAuth(),
)
