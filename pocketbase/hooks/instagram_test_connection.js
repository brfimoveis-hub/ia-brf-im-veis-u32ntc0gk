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
          })
        }
      } catch (netErr) {
        console.log('[INSTAGRAM_TEST] Erro ao testar token atual: ' + String(netErr))
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

    for (let t = 0; t < tokensToTry.length; t++) {
      const candidate = tokensToTry[t].token
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
          }
        } catch (_) {}

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
          break
        }

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
          if (discoveredPageToken && igAccountData) break
        }
      } catch (candErr) {
        console.log('[INSTAGRAM_TEST] Candidato falhou: ' + String(candErr))
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
        })
      } catch (saveErr) {
        console.log('[INSTAGRAM_TEST] Erro ao salvar token: ' + String(saveErr))
      }
    }

    // 4. Se não conseguiu obter automaticamente, analisa o motivo e retorna orientações claras.
    // Suporta tanto a família do app dedicado (instagram_basic, instagram_manage_messages, pages_show_list, etc.)
    // quanto a família nova (instagram_business_basic, instagram_business_manage_messages) sem falsos positivos.
    const hasBasic =
      allPermissions.indexOf('instagram_basic') !== -1 ||
      allPermissions.indexOf('instagram_business_basic') !== -1
    const hasMessages =
      allPermissions.indexOf('instagram_manage_messages') !== -1 ||
      allPermissions.indexOf('instagram_business_manage_messages') !== -1

    const missingPerms = []
    if (!hasBasic) missingPerms.push('instagram_basic')
    if (!hasMessages) missingPerms.push('instagram_manage_messages')

    const instructionMsg =
      missingPerms.length > 0
        ? 'Faltam permissões do Instagram na Meta (' +
          missingPerms.join(', ') +
          '). Clique em "Conectar Instagram (OAuth)" abaixo para autorizar a conexão.'
        : 'O Instagram ID ' +
          igBizId +
          ' não possui Page Token ativo vinculado. Conecte pelo botão "Conectar Instagram (OAuth)" ou cole o Page Access Token manualmente.'

    return e.json(200, {
      success: false,
      status: 'configured_waiting_token',
      message: instructionMsg,
      missing_perms: missingPerms,
      granted_perms: allPermissions,
      instructions: instructionMsg,
      app_id: igAppId,
    })
  },
  $apis.requireAuth(),
)
