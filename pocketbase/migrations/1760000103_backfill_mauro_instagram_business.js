migrate(
  (app) => {
    // 1. Localiza o usuário Mauro (ou brfimoveis@gmail.com)
    let user = null
    try {
      user = app.findRecordById('users', 'g5jto8bhulw01bz')
    } catch (_) {}

    if (!user) {
      try {
        const users = app.findRecordsByFilter(
          'users',
          'email = "brfimoveis@gmail.com"',
          '-created',
          1,
          0,
        )
        if (users && users.length > 0) user = users[0]
      } catch (_) {}
    }

    if (!user) {
      console.log('[BACKFILL_IG] Usuário não encontrado, pulando backfill.')
      return
    }

    const userToken = (user.getString('meta_instagram_user_token') || '').trim()
    const pageToken = (user.getString('meta_instagram_page_token') || '').trim()
    const sysToken = (user.getString('meta_whatsapp_access_token') || '').trim()

    const candidateTokens = []
    if (userToken) candidateTokens.push({ token: userToken, type: 'user_token' })
    if (pageToken && pageToken !== userToken)
      candidateTokens.push({ token: pageToken, type: 'page_token' })
    if (sysToken && sysToken !== userToken && sysToken !== pageToken)
      candidateTokens.push({ token: sysToken, type: 'sys_token' })

    console.log(
      '[BACKFILL_IG] Iniciando backfill para user ' +
        user.id +
        ' com ' +
        candidateTokens.length +
        ' tokens.',
    )

    let confirmedIgId = ''
    let confirmedUsername = ''
    let sourceDetail = ''
    let apiAuditData = {}

    // ETAPA 1: Validação contra a Página Oficial (1219427617930954)
    const OFFICIAL_PAGE_ID = '1219427617930954'
    for (let i = 0; i < candidateTokens.length; i++) {
      const tItem = candidateTokens[i]
      try {
        const pageRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/' +
            OFFICIAL_PAGE_ID +
            '?fields=id,name,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
            encodeURIComponent(tItem.token),
          method: 'GET',
          timeout: 10,
        })

        apiAuditData['page_' + OFFICIAL_PAGE_ID + '_' + tItem.type] = {
          status: pageRes.statusCode,
          json: pageRes.json,
        }

        if (pageRes.statusCode === 200 && pageRes.json) {
          const igAcc =
            pageRes.json.instagram_business_account ||
            pageRes.json.connected_instagram_account ||
            null
          if (igAcc && igAcc.id) {
            confirmedIgId = String(igAcc.id).trim()
            confirmedUsername = (igAcc.username || 'brf_imoveis_').trim()
            sourceDetail = 'Página Oficial ' + OFFICIAL_PAGE_ID + ' via ' + tItem.type
            console.log(
              '[BACKFILL_IG] Detectado via Página Oficial: ' +
                confirmedIgId +
                ' @' +
                confirmedUsername,
            )
            break
          }
        }
      } catch (errPage) {
        apiAuditData['page_' + OFFICIAL_PAGE_ID + '_' + tItem.type] = { error: String(errPage) }
      }
    }

    // ETAPA 2: Se a Página Oficial não retornou (ou exigiu perms adicionais), consulta as Páginas do usuário (/me/accounts)
    if (!confirmedIgId && userToken) {
      try {
        const accRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name},connected_instagram_account{id,username,name}&access_token=' +
            encodeURIComponent(userToken),
          method: 'GET',
          timeout: 12,
        })

        apiAuditData['me_accounts'] = {
          status: accRes.statusCode,
          count: accRes.json && accRes.json.data ? accRes.json.data.length : 0,
        }

        if (accRes.statusCode === 200 && accRes.json && Array.isArray(accRes.json.data)) {
          for (let pIdx = 0; pIdx < accRes.json.data.length; pIdx++) {
            const p = accRes.json.data[pIdx]
            const ig = p.instagram_business_account || p.connected_instagram_account || null
            if (ig && ig.id) {
              const uName = (ig.username || ig.name || '').toLowerCase().replace(/^@/, '').trim()
              if (uName === 'brf_imoveis_' || (p.name && p.name.indexOf('BRF') !== -1)) {
                confirmedIgId = String(ig.id).trim()
                confirmedUsername = (ig.username || 'brf_imoveis_').trim()
                sourceDetail = 'me/accounts página ' + p.name + ' (' + p.id + ')'
                if (p.access_token) {
                  user.set('meta_instagram_page_token', p.access_token)
                  user.set('meta_page_access_token', p.access_token)
                }
                break
              }
            }
          }
        }
      } catch (errMe) {
        apiAuditData['me_accounts_error'] = String(errMe)
      }
    }

    // ETAPA 3: Validação direta contra a Graph API dos IDs candidatos de Instagram comercial
    // (A API é a fonte da verdade — testa GET /{id}?fields=id,username)
    if (!confirmedIgId) {
      const igCandidateIds = ['17841418593400936', '17841418953400936']
      for (let cIdx = 0; cIdx < igCandidateIds.length; cIdx++) {
        const testId = igCandidateIds[cIdx]
        for (let tIdx = 0; tIdx < candidateTokens.length; tIdx++) {
          const tItem = candidateTokens[tIdx]
          try {
            const testRes = $http.send({
              url:
                'https://graph.facebook.com/v22.0/' +
                testId +
                '?fields=id,username,name&access_token=' +
                encodeURIComponent(tItem.token),
              method: 'GET',
              timeout: 8,
            })

            apiAuditData['ig_direct_' + testId + '_' + tItem.type] = {
              status: testRes.statusCode,
              json: testRes.json,
            }

            if (testRes.statusCode === 200 && testRes.json && testRes.json.id) {
              confirmedIgId = String(testRes.json.id).trim()
              confirmedUsername = (testRes.json.username || 'brf_imoveis_').trim()
              sourceDetail = 'Graph API direto no nó IG ' + testId + ' via ' + tItem.type
              break
            }
          } catch (errTest) {
            apiAuditData['ig_direct_' + testId + '_' + tItem.type] = { error: String(errTest) }
          }
        }
        if (confirmedIgId) break
      }
    }

    // Normaliza username para remover arroba
    const cleanUsername = confirmedUsername.toLowerCase().replace(/^@/, '').trim() || 'brf_imoveis_'

    const oldIg = user.getString('meta_instagram_business_id') || ''
    const oldUser = user.getString('instagram_username') || ''

    console.log(
      '[BACKFILL_IG] Resultado da validação Graph API: ID=' +
        confirmedIgId +
        ', username=' +
        cleanUsername +
        ', Fonte=' +
        sourceDetail,
    )

    // Se a Graph API confirmou a conta real, grava no registro do usuário
    if (confirmedIgId) {
      user.set('meta_instagram_business_id', confirmedIgId)
      user.set('instagram_username', cleanUsername)
      app.save(user)
      console.log('[BACKFILL_IG] Usuário atualizado com SUCESSO!')
    } else {
      console.log('[BACKFILL_IG] ATENÇÃO: Nenhuma conta IG confirmada pela Graph API.')
    }

    // Registra o resultado em system_logs para auditoria detalhada
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const logRecord = new Record(logsCol, {
        type: 'instagram_oauth_backfill_validation',
        message: confirmedIgId
          ? 'Backfill Instagram Business concluído com sucesso via Graph API (' +
            confirmedIgId +
            ' @' +
            cleanUsername +
            ')'
          : 'Backfill Instagram Business não detectou conta ativa via Graph API',
        payload: {
          user_id: user.id,
          source_detail: sourceDetail,
          old_instagram_business_id: oldIg,
          old_instagram_username: oldUser,
          confirmed_instagram_business_id: confirmedIgId,
          confirmed_instagram_username: cleanUsername,
          api_audit: apiAuditData,
          timestamp: new Date().toISOString(),
        },
        details:
          'Fonte: ' +
          (sourceDetail || 'nenhuma') +
          ' | Anterior: ID ' +
          oldIg +
          ' (@' +
          oldUser +
          ')' +
          ' | Atual: ID ' +
          (confirmedIgId || 'inalterado') +
          ' (@' +
          cleanUsername +
          ')',
        user_id: user.id,
      })
      app.save(logRecord)
    } catch (logErr) {
      console.log('[BACKFILL_IG] Erro ao gravar log de auditoria: ' + String(logErr))
    }
  },
  (app) => {},
)
