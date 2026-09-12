routerAdd(
  'POST',
  '/backend/v1/instagram/test_connection',
  (e) => {
    const userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    let user = null
    try {
      user = $app.findRecordById('users', userId)
    } catch (_) {
      return e.badRequestError('Usuário não encontrado')
    }

    const igBizId = (user.getString('meta_instagram_business_id') || '').trim()
    let igToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    const igAppId = (
      user.getString('meta_instagram_app_id') ||
      user.getString('meta_app_id') ||
      ''
    ).trim()
    const sysUserToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    const capiToken = (user.getString('meta_capi_token') || '').trim()

    if (!igBizId) {
      return e.json(200, {
        success: false,
        status: 'not_configured',
        message: 'Instagram Business ID não configurado no CRM.',
        instructions: 'Informe o Instagram Business ID nas configurações ou conecte via OAuth.',
      })
    }

    function maskToken(tok) {
      if (!tok || typeof tok !== 'string') return ''
      var trimmed = tok.trim()
      if (trimmed.length <= 4) return '***'
      return '...' + trimmed.slice(-4)
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

    var testedTokens = []
    var savedTokenGraphError = null

    // 1. Se já possuímos um token de página salvo, testa diretamente
    if (igToken) {
      try {
        const igRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            igBizId +
            '?fields=id,name,username,profile_picture_url',
          method: 'GET',
          headers: { Authorization: 'Bearer ' + igToken },
          timeout: 15,
        })

        if (igRes.statusCode >= 200 && igRes.statusCode < 300) {
          const d = igRes.json || {}
          const igName = d.username || d.name || ''
          return e.json(200, {
            success: true,
            status: 'connected',
            message: 'Conectado ✅' + (igName ? ' — @' + igName : '') + ' (ID: ' + igBizId + ')',
            data: d,
            token_saved: false,
            tested_tokens: [
              {
                type: 'saved_page_token',
                token_suffix: maskToken(igToken),
                status: 'ok',
                http_status: igRes.statusCode,
              },
            ],
          })
        }

        savedTokenGraphError = extractGraphError(igRes.json, igRes.statusCode)
        console.log(
          '[INSTAGRAM_TEST] passo 1 (token salvo) falhou: HTTP ' +
            savedTokenGraphError.http_status +
            ' code=' +
            (savedTokenGraphError.code !== null ? savedTokenGraphError.code : 'n/a') +
            ' subcode=' +
            (savedTokenGraphError.subcode !== null ? savedTokenGraphError.subcode : 'n/a') +
            ' msg=' +
            savedTokenGraphError.message,
        )

        testedTokens.push({
          type: 'saved_page_token',
          token_suffix: maskToken(igToken),
          status: 'failed',
          http_status: savedTokenGraphError.http_status,
          graph_error: savedTokenGraphError,
        })
      } catch (netErr) {
        const msg = String(netErr && netErr.message ? netErr.message : netErr)
        savedTokenGraphError = {
          http_status: 0,
          message: 'Erro de rede ao conectar à Meta Graph API: ' + msg,
          code: null,
          subcode: null,
          user_msg: null,
          type: 'NetworkError',
        }
        console.log('[INSTAGRAM_TEST] passo 1 (token salvo) falhou: ' + msg)
        testedTokens.push({
          type: 'saved_page_token',
          token_suffix: maskToken(igToken),
          status: 'network_error',
          graph_error: savedTokenGraphError,
        })
      }
    }

    // 2. Auto-descoberta via System User Token (ou CAPI Token)
    const tokensToTry = []
    if (sysUserToken) tokensToTry.push({ token: sysUserToken, type: 'system_user' })
    if (capiToken && capiToken !== sysUserToken) {
      tokensToTry.push({ token: capiToken, type: 'capi' })
    }

    let discoveredPageToken = ''
    let matchedPageId = ''
    let matchedPageName = ''
    let igAccountData = null
    let allPermissions = []
    let permissionsSourceToken = ''

    for (let t = 0; t < tokensToTry.length; t++) {
      const candidateItem = tokensToTry[t]
      const candidate = candidateItem.token
      const candType = candidateItem.type
      const candSuffix = maskToken(candidate)

      try {
        // Obter permissões concedidas neste token
        try {
          const permRes = $http.send({
            url:
              'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
              encodeURIComponent(candidate),
            method: 'GET',
            timeout: 10,
          })
          if (permRes.statusCode === 200 && permRes.json && Array.isArray(permRes.json.data)) {
            allPermissions = permRes.json.data
              .filter((p) => p.status === 'granted')
              .map((p) => p.permission)
            permissionsSourceToken = candType
          } else {
            const pErr = extractGraphError(permRes.json, permRes.statusCode)
            console.log(
              '[INSTAGRAM_TEST] auto-descoberta permissions (' +
                candType +
                ') falhou: HTTP ' +
                pErr.http_status +
                ' code=' +
                (pErr.code !== null ? pErr.code : 'n/a') +
                ' subcode=' +
                (pErr.subcode !== null ? pErr.subcode : 'n/a') +
                ' msg=' +
                pErr.message,
            )
          }
        } catch (pNetErr) {
          console.log(
            '[INSTAGRAM_TEST] auto-descoberta permissions (' +
              candType +
              ') erro de rede: ' +
              String(pNetErr),
          )
        }

        // Tentar teste direto com candidate
        const directIgRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            igBizId +
            '?fields=id,name,username,profile_picture_url&access_token=' +
            encodeURIComponent(candidate),
          method: 'GET',
          timeout: 10,
        })

        if (directIgRes.statusCode >= 200 && directIgRes.statusCode < 300) {
          discoveredPageToken = candidate
          igAccountData = directIgRes.json || {}
          testedTokens.push({
            type: candType,
            token_suffix: candSuffix,
            status: 'ok',
            http_status: directIgRes.statusCode,
          })
          break
        }

        const directErr = extractGraphError(directIgRes.json, directIgRes.statusCode)
        console.log(
          '[INSTAGRAM_TEST] auto-descoberta direct (' +
            candType +
            ') falhou: HTTP ' +
            directErr.http_status +
            ' code=' +
            (directErr.code !== null ? directErr.code : 'n/a') +
            ' subcode=' +
            (directErr.subcode !== null ? directErr.subcode : 'n/a') +
            ' msg=' +
            directErr.message,
        )

        // Tentar /me/accounts para buscar páginas gerenciadas e seus tokens
        const accountsRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=' +
            encodeURIComponent(candidate),
          method: 'GET',
          timeout: 10,
        })

        if (
          accountsRes.statusCode === 200 &&
          accountsRes.json &&
          Array.isArray(accountsRes.json.data)
        ) {
          const pages = accountsRes.json.data
          for (let p = 0; p < pages.length; p++) {
            const pg = pages[p]
            const pgToken = pg.access_token || ''
            const pgIg = pg.instagram_business_account || {}
            if (pgIg.id === igBizId || (!discoveredPageToken && pgToken)) {
              discoveredPageToken = pgToken
              matchedPageId = pg.id || ''
              matchedPageName = pg.name || ''
              if (pgIg.id) {
                igAccountData = pgIg
                break
              }
            }
          }
          testedTokens.push({
            type: candType,
            token_suffix: candSuffix,
            status: discoveredPageToken ? 'ok' : 'no_matching_page',
            http_status: accountsRes.statusCode,
            accounts_count: pages.length,
          })
          if (discoveredPageToken && igAccountData) break
        } else {
          const accErr = extractGraphError(accountsRes.json, accountsRes.statusCode)
          console.log(
            '[INSTAGRAM_TEST] auto-descoberta me/accounts (' +
              candType +
              ') falhou: HTTP ' +
              accErr.http_status +
              ' code=' +
              (accErr.code !== null ? accErr.code : 'n/a') +
              ' subcode=' +
              (accErr.subcode !== null ? accErr.subcode : 'n/a') +
              ' msg=' +
              accErr.message,
          )
          testedTokens.push({
            type: candType,
            token_suffix: candSuffix,
            status: 'failed',
            direct_error: directErr,
            accounts_error: accErr,
          })
        }
      } catch (candErr) {
        console.log(
          '[INSTAGRAM_TEST] auto-descoberta (' + candType + ') falhou: ' + String(candErr),
        )
        testedTokens.push({
          type: candType,
          token_suffix: candSuffix,
          status: 'network_error',
          message: String(candErr && candErr.message ? candErr.message : candErr),
        })
      }
    }

    // 3. Se obteve um token válido com sucesso, salva no usuário e retorna status connected
    if (discoveredPageToken) {
      try {
        user.set('meta_instagram_page_token', discoveredPageToken)
        if (!user.getString('meta_page_access_token')) {
          user.set('meta_page_access_token', discoveredPageToken)
        }
        $app.saveNoValidate(user)

        const igName = igAccountData
          ? igAccountData.username || igAccountData.name || ''
          : matchedPageName
        return e.json(200, {
          success: true,
          status: 'connected',
          message: 'Conectado com sucesso ✅' + (igName ? ' — @' + igName : '') + '!',
          token_saved: true,
          data: igAccountData || { id: igBizId, name: igName },
          page_id: matchedPageId,
          page_name: matchedPageName,
          tested_tokens: testedTokens,
        })
      } catch (saveErr) {
        console.log('[INSTAGRAM_TEST] Erro ao salvar token: ' + String(saveErr))
      }
    }

    // 4. Se não conseguiu obter automaticamente, analisa o motivo e retorna orientações claras.
    // REGRA DE OURO:
    // Se o token salvo existiu mas foi rejeitado pela Graph API, a mensagem principal DEVE ser sobre
    // o token (ex.: código 190 expirado/inválido, código 10 sem permissão, etc.), e NÃO a mensagem enganosa
    // "Faltam permissões do Instagram na Meta", porque as permissões avaliadas abaixo vieram dos tokens
    // de auto-descoberta (system user/CAPI) que pertencem a outro app e não refletem o app dedicado do Instagram.
    if (savedTokenGraphError) {
      const errCode = savedTokenGraphError.code
      const errSubcode = savedTokenGraphError.subcode
      const errMsg = savedTokenGraphError.message || 'Token rejeitado pela Meta Graph API'
      const errCodeStr =
        errCode !== null
          ? ' (code ' + errCode + (errSubcode !== null ? ', subcode ' + errSubcode : '') + ')'
          : ''

      const tokenRejectionMsg =
        'O token salvo foi rejeitado pela Meta: ' +
        errMsg +
        errCodeStr +
        ' — reconecte via OAuth ou cole um novo Page Access Token.'

      return e.json(200, {
        success: false,
        status: 'configured_waiting_token',
        message: tokenRejectionMsg,
        instructions: tokenRejectionMsg,
        graph_error: savedTokenGraphError,
        tested_tokens: testedTokens,
        app_id: igAppId,
      })
    }

    // Se NÃO havia token salvo, analisa permissões (só se vieram de token relevante)
    const hasBasic =
      allPermissions.indexOf('instagram_basic') !== -1 ||
      allPermissions.indexOf('instagram_business_basic') !== -1
    const hasMessages =
      allPermissions.indexOf('instagram_manage_messages') !== -1 ||
      allPermissions.indexOf('instagram_business_manage_messages') !== -1

    const missingPerms = []
    if (!hasBasic) missingPerms.push('instagram_basic')
    if (!hasMessages) missingPerms.push('instagram_manage_messages')

    let instructionMsg = ''
    if (allPermissions.length > 0 && missingPerms.length > 0) {
      instructionMsg =
        'Faltam permissões do Instagram na Meta (' +
        missingPerms.join(', ') +
        '). Clique em "Conectar Instagram (OAuth)" abaixo para autorizar a conexão.'
    } else {
      instructionMsg =
        'O Instagram ID ' +
        igBizId +
        ' não possui Page Token ativo vinculado. Conecte pelo botão "Conectar Instagram (OAuth)" ou cole o Page Access Token manualmente.'
    }

    return e.json(200, {
      success: false,
      status: 'configured_waiting_token',
      message: instructionMsg,
      missing_perms: missingPerms,
      granted_perms: allPermissions,
      instructions: instructionMsg,
      tested_tokens: testedTokens,
      app_id: igAppId,
    })
  },
  $apis.requireAuth(),
)
