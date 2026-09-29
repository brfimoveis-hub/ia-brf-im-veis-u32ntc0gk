// pocketbase/hooks/meta_assets_cleanup.js
// Hook de integração para a "Faxina de Ativos Meta"
// Endpoints:
// 1. GET  /backend/v1/meta/assets/scan   -> busca todos os ativos Meta usando os tokens disponíveis,
//                                          classifica se são protegidos, duplicados, conhecidos etc.,
//                                          e mescla com o estado salvo no checklist (coleção meta_assets_cleanup).
// 2. POST /backend/v1/meta/assets/status -> atualiza o status de um ativo no checklist (pending, cleaned, kept).

routerAdd(
  'GET',
  '/backend/v1/meta/assets/scan',
  (e) => {
    console.log('[META_CLEANUP] GET /backend/v1/meta/assets/scan solicitado')

    var user = null
    var userId = e.auth ? e.auth.id : ''
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }
    if (!user) {
      var authId = e.requestInfo().headers['x-user-id'] || ''
      if (authId) {
        try {
          user = $app.findRecordById('users', authId)
        } catch (_) {}
      }
    }
    if (!user) {
      try {
        user = $app.findAuthRecordByEmail('_pb_users_auth_', 'brfimoveis@gmail.com')
      } catch (_) {}
    }
    if (!user) {
      return e.unauthorizedError('Autenticação necessária')
    }

    // Identificar tokens
    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var pageToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var capiToken = (user.getString('meta_capi_token') || '').trim()
    var whatsappToken = (user.getString('meta_whatsapp_access_token') || '').trim()

    var primaryToken = oauthUserToken || capiToken || whatsappToken || pageToken

    var tokensPool = []
    if (oauthUserToken) tokensPool.push({ type: 'oauth_user', token: oauthUserToken })
    if (pageToken && pageToken !== oauthUserToken)
      tokensPool.push({ type: 'page', token: pageToken })
    if (capiToken && capiToken !== oauthUserToken && capiToken !== pageToken) {
      tokensPool.push({ type: 'capi', token: capiToken })
    }
    if (
      whatsappToken &&
      whatsappToken !== oauthUserToken &&
      whatsappToken !== pageToken &&
      whatsappToken !== capiToken
    ) {
      tokensPool.push({ type: 'whatsapp', token: whatsappToken })
    }

    // Constantes e IDs oficiais protegidos (INVIOLÁVEIS)
    var OFFICIAL_PAGE_ID = '1219427617930954'
    var OFFICIAL_WABA_ID = '3542548689255402'
    var OFFICIAL_WABA_PHONE_ID = '1239571259250639'
    var OFFICIAL_WABA_PHONE = '+55 48 99209-8050'
    var OFFICIAL_BUSINESS_ID = '1676016233499097' // BM "BRF Imóveis 1" proprietário da WABA e do WhatsApp oficial

    // Buscar estado salvo do checklist na coleção meta_assets_cleanup
    var savedCleanups = {}
    try {
      var cleanupRecords = $app.findRecordsByFilter(
        'meta_assets_cleanup',
        'user_id = "' + user.id + '"',
        '-created',
        500,
        0,
      )
      for (var r = 0; r < cleanupRecords.length; r++) {
        var rec = cleanupRecords[r]
        savedCleanups[rec.getString('asset_id')] = {
          id: rec.id,
          status: rec.getString('status'),
          notes: rec.getString('notes'),
          cleaned_at: rec.getString('cleaned_at'),
          is_protected: rec.getBool('is_protected'),
        }
      }
    } catch (errCleanups) {
      console.log('[META_CLEANUP] Erro ao carregar status salvo: ' + String(errCleanups))
    }

    var assetsMap = {} // asset_id -> AssetObject
    var missingScopes = []
    var grantedPermissions = []
    var tokenWarnings = []

    // 1. Checar permissões no token principal
    if (primaryToken) {
      try {
        var permRes = $http.send({
          url:
            'https://graph.facebook.com/v22.0/me/permissions?access_token=' +
            encodeURIComponent(primaryToken),
          method: 'GET',
          timeout: 12,
        })
        if (permRes.statusCode === 200 && permRes.json && Array.isArray(permRes.json.data)) {
          for (var p = 0; p < permRes.json.data.length; p++) {
            if (permRes.json.data[p].status === 'granted') {
              grantedPermissions.push(permRes.json.data[p].permission)
            }
          }
        }
      } catch (ePerm) {
        console.log('[META_CLEANUP] Erro ao consultar permissões: ' + String(ePerm))
      }
    } else {
      tokenWarnings.push('Nenhum token da Meta encontrado salvo no CRM.')
    }

    var requiredScopes = [
      'pages_show_list',
      'pages_read_engagement',
      'instagram_basic',
      'business_management',
    ]
    for (var s = 0; s < requiredScopes.length; s++) {
      if (grantedPermissions.indexOf(requiredScopes[s]) === -1) {
        missingScopes.push(requiredScopes[s])
      }
    }

    // Helper para adicionar ou mesclar ativo
    function addAsset(asset) {
      if (!asset || !asset.id) return
      var id = String(asset.id).trim()
      var existing = assetsMap[id]

      // Checagem de proteção
      var isProtected = false
      var protectionReason = ''

      if (id === OFFICIAL_PAGE_ID) {
        isProtected = true
        protectionReason =
          'Página oficial "BRF Imóveis" (ID 1219427617930954). ATIVO PROTEGIDO — NUNCA EXCLUIR.'
      } else if (
        id === OFFICIAL_BUSINESS_ID ||
        (asset.type === 'business' &&
          (id === OFFICIAL_BUSINESS_ID ||
            (asset.name && asset.name.indexOf('BRF Imóveis 1') !== -1)))
      ) {
        isProtected = true
        protectionReason =
          'Portfólio / Business Manager que contém o WABA e o WhatsApp oficial (+55 48 99209-8050). ATIVO PROTEGIDO — NUNCA EXCLUIR.'
      } else if (id === OFFICIAL_WABA_ID || id === OFFICIAL_WABA_PHONE_ID) {
        isProtected = true
        protectionReason =
          'WhatsApp Business Account / Linha telefônica oficial da Bia (+55 48 99209-8050). ATIVO PROTEGIDO — NUNCA EXCLUIR.'
      } else if (
        asset.name &&
        (asset.name === 'mauro.brfimoveis' || asset.username === 'mauro.brfimoveis')
      ) {
        isProtected = true
        protectionReason =
          'Conta oficial do Instagram @mauro.brfimoveis da BRF Imóveis. ATIVO PROTEGIDO.'
      }

      // Se é o Instagram duplicado/antigo conhecido
      var isKnownDuplicate = false
      var duplicateNotes = ''
      var cleanTargetName = (asset.name || asset.username || '').toLowerCase().trim()
      if (cleanTargetName === 'brf_imoveis_' || cleanTargetName.indexOf('brf_imoveis_') !== -1) {
        isKnownDuplicate = true
        duplicateNotes =
          'Conta antiga/duplicada do Instagram (@brf_imoveis_). Recomendado para limpeza!'
      } else if (
        asset.type === 'page' &&
        id !== OFFICIAL_PAGE_ID &&
        (cleanTargetName.indexOf('brf') !== -1 || cleanTargetName.indexOf('imóveis') !== -1)
      ) {
        isKnownDuplicate = true
        duplicateNotes =
          'Página duplicada ou não oficial (ID ' +
          id +
          '). A página oficial é a de ID 1219427617930954.'
      }

      // Mesclar com checklist salvo
      var saved = savedCleanups[id]
      var currentStatus = saved ? saved.status : isKnownDuplicate ? 'pending' : 'pending'

      // Se for protegido, o status fica obrigatoriamente mantido ou preservado
      if (isProtected) {
        currentStatus = 'kept'
      }

      var directManageUrl = ''
      if (asset.type === 'page') {
        directManageUrl = 'https://www.facebook.com/' + id + '/settings/?tab=settings'
      } else if (asset.type === 'instagram') {
        directManageUrl = 'https://business.facebook.com/settings/instagram-account-v2'
      } else if (asset.type === 'ad_account') {
        directManageUrl = 'https://business.facebook.com/settings/ad-accounts'
      } else if (asset.type === 'business') {
        directManageUrl = 'https://business.facebook.com/settings/info?business_id=' + id
      } else if (asset.type === 'waba') {
        directManageUrl = 'https://business.facebook.com/settings/whatsapp-business-accounts'
      } else {
        directManageUrl = 'https://business.facebook.com/settings/'
      }

      assetsMap[id] = {
        id: id,
        name: asset.name || (existing && existing.name) || 'Sem nome (' + id + ')',
        type: asset.type || (existing && existing.type) || 'other',
        category: asset.category || (existing && existing.category) || '',
        username: asset.username || (existing && existing.username) || '',
        is_protected: isProtected,
        protection_reason: protectionReason,
        is_known_duplicate: isKnownDuplicate,
        duplicate_notes: duplicateNotes,
        status: currentStatus,
        notes: (saved && saved.notes) || duplicateNotes || '',
        cleaned_at: (saved && saved.cleaned_at) || null,
        saved_record_id: (saved && saved.id) || null,
        direct_url: directManageUrl,
        meta_business_url: 'https://business.facebook.com/settings/',
        details: asset.details || (existing && existing.details) || {},
      }
    }

    // 2. Sempre adicionar os ativos oficiais conhecidos (garantindo que apareçam na lista com o selo de proteção)
    addAsset({
      id: OFFICIAL_BUSINESS_ID,
      name: 'BRF Imóveis 1 (Portfólio de Negócios Oficial)',
      type: 'business',
      category: 'Meta Business Manager',
      details: {
        role: 'Portfólio comercial primário contendo a WABA e WhatsApp da BIA',
        official: true,
      },
    })

    addAsset({
      id: OFFICIAL_PAGE_ID,
      name: 'BRF Imóveis (Página Oficial do Facebook)',
      type: 'page',
      category: 'Página do Facebook',
      details: {
        official: true,
        verified_in_crm: true,
      },
    })

    addAsset({
      id: OFFICIAL_WABA_ID,
      name: 'BRFImóveis WhatsApp Oficial (+55 48 99209-8050)',
      type: 'waba',
      category: 'WhatsApp Business Account',
      details: {
        phone_number: OFFICIAL_WABA_PHONE,
        phone_number_id: OFFICIAL_WABA_PHONE_ID,
        official: true,
      },
    })

    // Adiciona o IG oficial do Mauro / BRF Imóveis
    addAsset({
      id: 'mauro.brfimoveis',
      name: 'mauro.brfimoveis',
      username: 'mauro.brfimoveis',
      type: 'instagram',
      category: 'Instagram Business',
      details: {
        official: true,
      },
    })

    // Adiciona o IG antigo / duplicado conhecido como candidato a limpeza
    addAsset({
      id: 'brf_imoveis_',
      name: 'brf_imoveis_',
      username: 'brf_imoveis_',
      type: 'instagram',
      category: 'Instagram Antigo / Duplicado',
      details: {
        candidate_cleanup: true,
        reason: 'Conta antiga do Instagram a ser limpa / desativada na Central de Contas',
      },
    })

    // Adiciona a página secundária / teste 1343797128806374 (se existir na Meta) como candidata a revisão
    addAsset({
      id: '1343797128806374',
      name: 'BRF Imóveis (Página Secundária / Teste)',
      type: 'page',
      category: 'Página do Facebook Secundária',
      details: {
        candidate_cleanup: true,
        reason: 'Página secundária diferente da Página Oficial ID 1219427617930954',
      },
    })

    // Adiciona a conta de anúncios conhecida
    addAsset({
      id: '1487400719850387',
      name: 'BRF Imóveis - Conta de Anúncios (act_1487400719850387)',
      type: 'ad_account',
      category: 'Conta de Anúncios Meta',
      details: {
        currency: 'BRL',
      },
    })

    // 3. Fazer consultas ativas na Meta Graph API para descobrir todos os outros ativos em tempo real
    for (var t = 0; t < tokensPool.length; t++) {
      var tokItem = tokensPool[t]
      var currentTok = tokItem.token

      // 3.a) /me/accounts (Páginas e Contas do Instagram vinculadas)
      try {
        var accUrl =
          'https://graph.facebook.com/v22.0/me/accounts?fields=id,name,category,access_token,instagram_business_account{id,username,name}&limit=100&access_token=' +
          encodeURIComponent(currentTok)
        var accRes = $http.send({ url: accUrl, method: 'GET', timeout: 12 })
        if (accRes.statusCode === 200 && accRes.json && Array.isArray(accRes.json.data)) {
          var pList = accRes.json.data
          for (var i = 0; i < pList.length; i++) {
            var pItem = pList[i]
            var pageId = String(pItem.id || '')
            if (pageId) {
              addAsset({
                id: pageId,
                name: pItem.name || 'Página ' + pageId,
                type: 'page',
                category: pItem.category || 'Página do Facebook',
                details: { source: 'me/accounts', token_type: tokItem.type },
              })
            }
            if (pItem.instagram_business_account && pItem.instagram_business_account.id) {
              var igAcc = pItem.instagram_business_account
              addAsset({
                id: String(igAcc.id),
                name: igAcc.username || igAcc.name || 'Instagram ' + igAcc.id,
                username: igAcc.username || '',
                type: 'instagram',
                category: 'Instagram Business',
                details: { linked_page_id: pageId, linked_page_name: pItem.name },
              })
            }
          }
        }
      } catch (eAcc) {
        console.log('[META_CLEANUP] Falha ao consultar me/accounts: ' + String(eAcc))
      }

      // 3.b) /me/businesses (Portfólios empresariais gerenciados pelo usuário)
      try {
        var bizUrl =
          'https://graph.facebook.com/v22.0/me/businesses?fields=id,name,verification_status&limit=50&access_token=' +
          encodeURIComponent(currentTok)
        var bizRes = $http.send({ url: bizUrl, method: 'GET', timeout: 12 })
        if (bizRes.statusCode === 200 && bizRes.json && Array.isArray(bizRes.json.data)) {
          var bList = bizRes.json.data
          for (var b = 0; b < bList.length; b++) {
            var bItem = bList[b]
            var bizId = String(bItem.id || '')
            if (bizId) {
              addAsset({
                id: bizId,
                name: bItem.name || 'Business ' + bizId,
                type: 'business',
                category: 'Portfólio de Negócios (Business Manager)',
                details: {
                  verification_status: bItem.verification_status || 'unknown',
                  source: 'me/businesses',
                },
              })

              // Se tivermos acesso ao business, tentar listar as contas de anúncio e páginas de dentro dele
              try {
                var bizPagesUrl =
                  'https://graph.facebook.com/v22.0/' +
                  bizId +
                  '/owned_pages?fields=id,name,category&access_token=' +
                  encodeURIComponent(currentTok)
                var bpRes = $http.send({ url: bizPagesUrl, method: 'GET', timeout: 8 })
                if (bpRes.statusCode === 200 && bpRes.json && Array.isArray(bpRes.json.data)) {
                  for (var bp = 0; bp < bpRes.json.data.length; bp++) {
                    var bpItem = bpRes.json.data[bp]
                    addAsset({
                      id: String(bpItem.id),
                      name: bpItem.name,
                      type: 'page',
                      category: 'Página BM ' + bizId,
                    })
                  }
                }
              } catch (_) {}

              try {
                var bizAdAccUrl =
                  'https://graph.facebook.com/v22.0/' +
                  bizId +
                  '/owned_ad_accounts?fields=id,name,account_status,currency&access_token=' +
                  encodeURIComponent(currentTok)
                var baRes = $http.send({ url: bizAdAccUrl, method: 'GET', timeout: 8 })
                if (baRes.statusCode === 200 && baRes.json && Array.isArray(baRes.json.data)) {
                  for (var ba = 0; ba < baRes.json.data.length; ba++) {
                    var baItem = baRes.json.data[ba]
                    addAsset({
                      id: String(baItem.id || '').replace(/^act_/, ''),
                      name: baItem.name || 'Conta de Anúncios ' + baItem.id,
                      type: 'ad_account',
                      category: 'Conta de Anúncios BM',
                      details: { currency: baItem.currency, status: baItem.account_status },
                    })
                  }
                }
              } catch (_) {}
            }
          }
        }
      } catch (eBiz) {
        console.log('[META_CLEANUP] Falha ao consultar me/businesses: ' + String(eBiz))
      }

      // 3.c) /me/adaccounts (Contas de anúncio acessíveis)
      try {
        var adAccUrl =
          'https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_status,currency,business{id,name}&limit=50&access_token=' +
          encodeURIComponent(currentTok)
        var adAccRes = $http.send({ url: adAccUrl, method: 'GET', timeout: 12 })
        if (adAccRes.statusCode === 200 && adAccRes.json && Array.isArray(adAccRes.json.data)) {
          var aList = adAccRes.json.data
          for (var a = 0; a < aList.length; a++) {
            var aItem = aList[a]
            var aId = String(aItem.id || '').replace(/^act_/, '')
            if (aId) {
              addAsset({
                id: aId,
                name: aItem.name || 'Conta de Anúncios ' + aId,
                type: 'ad_account',
                category: 'Conta de Anúncios Meta Ads',
                details: {
                  currency: aItem.currency,
                  account_status: aItem.account_status,
                  business: aItem.business || null,
                },
              })
            }
          }
        }
      } catch (eAdAcc) {
        console.log('[META_CLEANUP] Falha ao consultar me/adaccounts: ' + String(eAdAcc))
      }
    }

    // Transformar assetsMap em array ordenado
    var assetsList = []
    var totalCount = 0
    var cleanedCount = 0
    var keptCount = 0
    var pendingCount = 0
    var protectedCount = 0

    var keys = Object.keys(assetsMap)
    for (var k = 0; k < keys.length; k++) {
      var item = assetsMap[keys[k]]
      assetsList.push(item)
      totalCount++
      if (item.is_protected) {
        protectedCount++
      }
      if (item.status === 'cleaned') {
        cleanedCount++
      } else if (item.status === 'kept') {
        keptCount++
      } else {
        pendingCount++
      }
    }

    // Ordenação:
    // 1. Protegidos no topo (com o selo de invioláveis)
    // 2. Candidatos recomendados para limpeza (ex: brf_imoveis_)
    // 3. Demais pendentes
    // 4. Já limpos
    assetsList.sort(function (a, b) {
      if (a.is_protected && !b.is_protected) return -1
      if (!a.is_protected && b.is_protected) return 1
      if (a.is_known_duplicate && !b.is_known_duplicate) return -1
      if (!a.is_known_duplicate && b.is_known_duplicate) return 1
      if (a.status === 'pending' && b.status !== 'pending') return -1
      if (a.status !== 'pending' && b.status === 'pending') return 1
      return (a.name || '').localeCompare(b.name || '')
    })

    return e.json(200, {
      success: true,
      assets: assetsList,
      summary: {
        total: totalCount,
        cleaned: cleanedCount,
        kept: keptCount,
        pending: pendingCount,
        protected: protectedCount,
        cleanable_total: totalCount - protectedCount,
        cleanable_pending: Math.max(0, pendingCount - protectedCount),
        progress_percentage:
          totalCount - protectedCount > 0
            ? Math.round((cleanedCount / (totalCount - protectedCount)) * 100)
            : 100,
      },
      official_rules: {
        official_page_id: OFFICIAL_PAGE_ID,
        official_waba_id: OFFICIAL_WABA_ID,
        official_phone: OFFICIAL_WABA_PHONE,
        official_business_id: OFFICIAL_BUSINESS_ID,
      },
      token_diagnostics: {
        missing_scopes: missingScopes,
        granted_permissions: grantedPermissions,
        warnings: tokenWarnings,
        has_business_management: grantedPermissions.indexOf('business_management') !== -1,
      },
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------
// 2. POST /backend/v1/meta/assets/status
// Salva ou atualiza a decisão do checklist para um ativo
// -------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/meta/assets/status',
  (e) => {
    console.log('[META_CLEANUP] POST /backend/v1/meta/assets/status recebido')

    var user = null
    var userId = e.auth ? e.auth.id : ''
    if (userId) {
      try {
        user = $app.findRecordById('users', userId)
      } catch (_) {}
    }
    if (!user) {
      return e.unauthorizedError('Autenticação necessária')
    }

    var body = e.requestInfo().body || {}
    var assetId = String(body.asset_id || '').trim()
    var assetName = String(body.asset_name || '').trim()
    var assetType = String(body.asset_type || 'other').trim()
    var status = String(body.status || 'pending').trim() // pending, cleaned, kept
    var notes = String(body.notes || '').trim()

    if (!assetId) {
      return e.badRequestError('asset_id é obrigatório.')
    }

    if (['pending', 'cleaned', 'kept'].indexOf(status) === -1) {
      return e.badRequestError('Status inválido. Escolha: pending, cleaned ou kept.')
    }

    // Regra rígida: ativos protegidos NÃO podem ser marcados como cleaned
    var OFFICIAL_PAGE_ID = '1219427617930954'
    var OFFICIAL_BUSINESS_ID = '1676016233499097'
    var OFFICIAL_WABA_ID = '3542548689255402'

    if (
      (assetId === OFFICIAL_PAGE_ID ||
        assetId === OFFICIAL_BUSINESS_ID ||
        assetId === OFFICIAL_WABA_ID) &&
      status === 'cleaned'
    ) {
      return e.badRequestError(
        'OPERAÇÃO BLOQUEADA: Este ativo é estritamente PROTEGIDO e não pode ser marcado para exclusão ou limpo.',
      )
    }

    var isProtected =
      assetId === OFFICIAL_PAGE_ID ||
      assetId === OFFICIAL_BUSINESS_ID ||
      assetId === OFFICIAL_WABA_ID ||
      assetName === 'mauro.brfimoveis'

    var protectionReason = isProtected
      ? 'Ativo oficial da BRF Imóveis / WhatsApp da Bia. Proteção mandatória ativa.'
      : ''

    try {
      var col = $app.findCollectionByNameOrId('meta_assets_cleanup')

      // Verificar se já existe registro desse ativo para o usuário
      var existingRec = null
      try {
        var existingRecords = $app.findRecordsByFilter(
          'meta_assets_cleanup',
          'user_id = "' + user.id + '" && asset_id = "' + assetId + '"',
          '-created',
          1,
          0,
        )
        if (existingRecords.length > 0) {
          existingRec = existingRecords[0]
        }
      } catch (_) {}

      var targetRecord = existingRec || new Record(col)

      targetRecord.set('user_id', user.id)
      targetRecord.set('asset_id', assetId)
      if (assetName) targetRecord.set('asset_name', assetName)
      if (assetType) targetRecord.set('asset_type', assetType)
      targetRecord.set('status', status)
      targetRecord.set('is_protected', isProtected)
      if (protectionReason) targetRecord.set('protection_reason', protectionReason)
      if (notes) targetRecord.set('notes', notes)

      if (status === 'cleaned') {
        targetRecord.set('cleaned_at', new Date().toISOString())
      } else {
        targetRecord.set('cleaned_at', null)
      }

      $app.save(targetRecord)

      // Registrar log no sistema
      try {
        var logCol = $app.findCollectionByNameOrId('system_logs')
        var log = new Record(logCol)
        log.set('user_id', user.id)
        log.set('type', 'meta_assets_cleanup')
        log.set(
          'message',
          'Checklist Meta atualizado: ' + (assetName || assetId) + ' marcado como "' + status + '"',
        )
        log.set('payload', {
          asset_id: assetId,
          asset_name: assetName,
          status: status,
          is_protected: isProtected,
        })
        $app.save(log)
      } catch (_) {}

      return e.json(200, {
        success: true,
        record_id: targetRecord.id,
        asset_id: assetId,
        status: status,
        message: 'Status do ativo atualizado no checklist com sucesso.',
      })
    } catch (saveErr) {
      console.log('[META_CLEANUP] Erro ao salvar status do checklist: ' + String(saveErr))
      return e.json(500, {
        success: false,
        message: 'Falha ao salvar no banco de dados: ' + String(saveErr),
      })
    }
  },
  $apis.requireAuth(),
)
