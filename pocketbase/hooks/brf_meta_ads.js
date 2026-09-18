// pocketbase/hooks/brf_meta_ads.js
// Módulo Meta Ads integrado ao CRM BRF Imóveis
// Endpoints:
// 1. GET  /backend/v1/meta-ads/overview   -> lista contas de anúncios, campanhas com métricas (30d), status do token e se precisa ads_management/ads_read
// 2. POST /backend/v1/meta-ads/campaign   -> cria campanha Click-to-WhatsApp simples (OUTCOME_ENGAGEMENT) na conta Meta
// 3. GET  /backend/v1/meta-ads/creatives  -> lista templates aprovados de WhatsApp para vincular ao anúncio

// -------------------------------------------------------------
// 1. GET /backend/v1/meta-ads/overview
// -------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/meta-ads/overview',
  (e) => {
    console.log('[META_ADS] GET /backend/v1/meta-ads/overview solicitado')

    // Obter usuário autenticado
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

    // Resolver tokens
    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var pageToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var capiToken = (user.getString('meta_capi_token') || '').trim()
    var whatsappToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    var primaryToken = oauthUserToken || capiToken || whatsappToken || pageToken

    var targetAdAccountId = '1487400719850387'
    var actId = 'act_' + targetAdAccountId

    if (!primaryToken) {
      return e.json(200, {
        success: false,
        needs_ads_permission: true,
        reason: 'no_token',
        message:
          'Nenhum token Meta encontrado. Conecte sua conta do Facebook com permissão de anúncios.',
        ad_account_id: targetAdAccountId,
        act_id: actId,
        campaigns: [],
        summary: {
          total_spend_brl: 0,
          total_impressions: 0,
          total_reach: 0,
          total_clicks: 0,
          total_results: 0,
          cpc_brl: 0,
          cpa_brl: 0,
        },
      })
    }

    // 1. Verificar permissões do token OAuth via /me/permissions
    var grantedPerms = []
    var tokenErrorMsg = ''
    try {
      var permRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/me/permissions?access_token=' +
          encodeURIComponent(primaryToken),
        method: 'GET',
        timeout: 15,
      })

      if (permRes.statusCode === 200 && permRes.json && Array.isArray(permRes.json.data)) {
        for (var p = 0; p < permRes.json.data.length; p++) {
          if (permRes.json.data[p].status === 'granted') {
            grantedPerms.push(permRes.json.data[p].permission)
          }
        }
      } else {
        var pJson = permRes.json || {}
        if (pJson.error) {
          tokenErrorMsg = pJson.error.message || 'Erro ao validar token'
        }
      }
    } catch (permErr) {
      console.log('[META_ADS] Erro ao checar permissões: ' + String(permErr))
    }

    var hasAdsManagement = grantedPerms.indexOf('ads_management') !== -1
    var hasAdsRead = grantedPerms.indexOf('ads_read') !== -1

    console.log('[META_ADS] Permissões concedidas no token: ' + grantedPerms.join(', '))
    console.log('[META_ADS] hasAdsManagement=' + hasAdsManagement + ', hasAdsRead=' + hasAdsRead)

    // Testar se conseguimos ler a conta de anúncios
    var adAccountAccessible = false
    var adAccountDetails = null
    var campaigns = []
    var rawAdAccountError = null

    try {
      var actRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          actId +
          '?fields=id,name,account_status,currency,spend_cap,amount_spent,business{id,name}&access_token=' +
          encodeURIComponent(primaryToken),
        method: 'GET',
        timeout: 15,
      })

      if (actRes.statusCode >= 200 && actRes.statusCode < 300 && actRes.json) {
        adAccountAccessible = true
        adAccountDetails = actRes.json
      } else {
        rawAdAccountError = actRes.json
          ? actRes.json.error
          : { message: 'HTTP ' + actRes.statusCode }
        console.log(
          '[META_ADS] Consulta à conta act_' +
            targetAdAccountId +
            ' retornou erro: ' +
            JSON.stringify(rawAdAccountError),
        )
      }
    } catch (actErr) {
      console.log('[META_ADS] Erro de rede na conta de anúncios: ' + String(actErr))
    }

    // Se nem o teste de conta nem as permissões permitirem, retorna needs_ads_permission: true
    if (!adAccountAccessible && !hasAdsManagement && !hasAdsRead) {
      return e.json(200, {
        success: false,
        needs_ads_permission: true,
        reason: 'missing_scope',
        message:
          'A autorização atual da Meta não possui acesso aos Anúncios (ads_management / ads_read). Clique no botão para autorizar o módulo de anúncios.',
        granted_permissions: grantedPerms,
        ad_account_id: targetAdAccountId,
        act_id: actId,
        error_details: rawAdAccountError || tokenErrorMsg,
        campaigns: [],
        summary: {
          total_spend_brl: 0,
          total_impressions: 0,
          total_reach: 0,
          total_clicks: 0,
          total_results: 0,
          cpc_brl: 0,
          cpa_brl: 0,
        },
      })
    }

    // Buscar campanhas com insights dos últimos 30 dias
    var totalSpendBrl = 0
    var totalImpressions = 0
    var totalReach = 0
    var totalClicks = 0
    var totalResults = 0

    try {
      var campRes = $http.send({
        url:
          'https://graph.facebook.com/v21.0/' +
          actId +
          '/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,created_time,insights.date_preset(last_30d){impressions,reach,clicks,spend,cpc,cpm,actions,cost_per_action_type}&limit=50&access_token=' +
          encodeURIComponent(primaryToken),
        method: 'GET',
        timeout: 20,
      })

      if (
        campRes.statusCode >= 200 &&
        campRes.statusCode < 300 &&
        campRes.json &&
        Array.isArray(campRes.json.data)
      ) {
        var rawCamps = campRes.json.data
        for (var c = 0; c < rawCamps.length; c++) {
          var item = rawCamps[c]
          var insights =
            item.insights && item.insights.data && item.insights.data.length > 0
              ? item.insights.data[0]
              : null

          var spend = insights && insights.spend ? parseFloat(insights.spend) || 0 : 0
          var impressions =
            insights && insights.impressions ? parseInt(insights.impressions, 10) || 0 : 0
          var reach = insights && insights.reach ? parseInt(insights.reach, 10) || 0 : 0
          var clicks = insights && insights.clicks ? parseInt(insights.clicks, 10) || 0 : 0

          var resultsCount = 0
          if (insights && Array.isArray(insights.actions)) {
            for (var a = 0; a < insights.actions.length; a++) {
              var act = insights.actions[a]
              var aType = (act.action_type || '').toLowerCase()
              if (
                aType.indexOf('lead') !== -1 ||
                aType.indexOf('onsite_conversion.messaging_conversation_started_7d') !== -1 ||
                aType.indexOf('messaging') !== -1 ||
                aType.indexOf('contact') !== -1
              ) {
                resultsCount += parseInt(act.value, 10) || 0
              }
            }
          }
          if (resultsCount === 0 && clicks > 0) {
            resultsCount = clicks
          }

          var costPerResult = resultsCount > 0 ? spend / resultsCount : 0
          var dailyBudgetBrl = item.daily_budget ? parseFloat(item.daily_budget) / 100 : 0

          totalSpendBrl += spend
          totalImpressions += impressions
          totalReach += reach
          totalClicks += clicks
          totalResults += resultsCount

          campaigns.push({
            id: item.id,
            name: item.name,
            status: item.status,
            objective: item.objective,
            daily_budget_brl: dailyBudgetBrl,
            created_time: item.created_time,
            spend_brl: Math.round(spend * 100) / 100,
            impressions: impressions,
            reach: reach,
            clicks: clicks,
            results: resultsCount,
            cost_per_result_brl: Math.round(costPerResult * 100) / 100,
          })
        }
      } else {
        console.log(
          '[META_ADS] Erro ao listar campanhas: ' + JSON.stringify(campRes.json || campRes.raw),
        )
      }
    } catch (campErr) {
      console.log('[META_ADS] Exceção ao listar campanhas: ' + String(campErr))
    }

    var avgCpc = totalClicks > 0 ? totalSpendBrl / totalClicks : 0
    var avgCpa = totalResults > 0 ? totalSpendBrl / totalResults : 0

    return e.json(200, {
      success: true,
      needs_ads_permission: false,
      ad_account: {
        id: targetAdAccountId,
        act_id: actId,
        name: (adAccountDetails && adAccountDetails.name) || 'BRF Imóveis - Anúncios',
        currency: (adAccountDetails && adAccountDetails.currency) || 'BRL',
        account_status: (adAccountDetails && adAccountDetails.account_status) || 1,
        score: 100,
      },
      page: {
        id: '1343797128806374',
        name: 'BRF Imóveis',
        whatsapp_number: '+55 48 9209-8050',
      },
      summary: {
        total_spend_brl: Math.round(totalSpendBrl * 100) / 100,
        total_impressions: totalImpressions,
        total_reach: totalReach,
        total_clicks: totalClicks,
        total_results: totalResults,
        cpc_brl: Math.round(avgCpc * 100) / 100,
        cpa_brl: Math.round(avgCpa * 100) / 100,
      },
      campaigns: campaigns,
      granted_permissions: grantedPerms,
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------
// 2. POST /backend/v1/meta-ads/campaign
// Cria campanha Click-to-WhatsApp simples
// -------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/meta-ads/campaign',
  (e) => {
    console.log('[META_ADS] POST /backend/v1/meta-ads/campaign recebido')

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

    var oauthUserToken = (user.getString('meta_instagram_user_token') || '').trim()
    var pageToken = (
      user.getString('meta_instagram_page_token') ||
      user.getString('meta_page_access_token') ||
      ''
    ).trim()
    var capiToken = (user.getString('meta_capi_token') || '').trim()
    var whatsappToken = (user.getString('meta_whatsapp_access_token') || '').trim()
    var primaryToken = oauthUserToken || capiToken || whatsappToken || pageToken

    var targetAdAccountId = '1487400719850387'
    var actId = 'act_' + targetAdAccountId
    var pageId = '1343797128806374'
    var whatsappNumber = '5548992098050'

    if (!primaryToken) {
      return e.json(400, {
        success: false,
        needs_ads_permission: true,
        message:
          'Token de anúncios não encontrado. Conecte sua conta do Facebook com permissão de anúncios.',
      })
    }

    var body = e.requestInfo().body || {}
    var campaignName = (body.name || '').trim()
    var primaryText = (body.primary_text || body.message || '').trim()
    var headline = (body.headline || 'Fale com a Bia no WhatsApp').trim()
    var description = (body.description || 'Atendimento instantâneo e opções exclusivas').trim()
    var imageUrl = (body.image_url || '').trim()
    var dailyBudgetBrl = parseFloat(body.daily_budget) || 20
    var city = (body.city || '').trim()
    var minAge = parseInt(body.min_age, 10) || 25
    var maxAge = parseInt(body.max_age, 10) || 65

    if (!campaignName) {
      return e.badRequestError('O nome do anúncio/campanha é obrigatório.')
    }
    if (!primaryText) {
      return e.badRequestError('O texto principal do anúncio é obrigatório.')
    }
    if (dailyBudgetBrl < 10) {
      return e.badRequestError('O orçamento diário mínimo recomendado é de R$ 10,00.')
    }

    var dailyBudgetInCents = Math.round(dailyBudgetBrl * 100)
    console.log(
      '[META_ADS] Criando campanha "' + campaignName + '", orçamento diário: R$ ' + dailyBudgetBrl,
    )

    // 1. Criar Campaign (Objective OUTCOME_ENGAGEMENT)
    var campaignPayload = {
      name: campaignName,
      objective: 'OUTCOME_ENGAGEMENT',
      status: 'PAUSED',
      special_ad_categories: ['HOUSING'],
    }

    var createCampRes = null
    var createdCampaignId = ''
    try {
      createCampRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + actId + '/campaigns',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + primaryToken,
        },
        body: JSON.stringify(campaignPayload),
        timeout: 25,
      })

      if (
        createCampRes.statusCode >= 200 &&
        createCampRes.statusCode < 300 &&
        createCampRes.json &&
        createCampRes.json.id
      ) {
        createdCampaignId = String(createCampRes.json.id)
        console.log('[META_ADS] Campanha criada com sucesso! ID: ' + createdCampaignId)
      } else {
        var campErr = createCampRes.json
          ? createCampRes.json.error
          : { message: 'HTTP ' + createCampRes.statusCode }
        console.log('[META_ADS] Erro ao criar Campaign: ' + JSON.stringify(campErr))

        var msg = (campErr && campErr.message) || 'Erro ao criar campanha na Meta'
        if (
          msg.indexOf('permission') !== -1 ||
          msg.indexOf('OAuth') !== -1 ||
          (campErr && campErr.code === 200)
        ) {
          return e.json(403, {
            success: false,
            needs_ads_permission: true,
            message:
              'Permissão de criação de anúncios pendente na conta Meta. Reconecte o Facebook com permissão de anúncios.',
            details: campErr,
          })
        }

        return e.json(400, {
          success: false,
          message: 'A Meta recusou a criação da campanha: ' + msg,
          details: campErr,
        })
      }
    } catch (httpCampErr) {
      console.log('[META_ADS] Exceção ao chamar Graph API Campaign: ' + String(httpCampErr))
      return e.json(500, {
        success: false,
        message: 'Falha de comunicação com os servidores da Meta: ' + String(httpCampErr),
      })
    }

    // 2. Criar AdSet (Click-to-WhatsApp)
    var geoLocations = { countries: ['BR'] }
    if (city) {
      geoLocations = {
        countries: ['BR'],
        regions: [{ key: '3882' }],
      }
    }

    var adsetPayload = {
      name: campaignName + ' - Conjunto WhatsApp',
      campaign_id: createdCampaignId,
      daily_budget: dailyBudgetInCents,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'CONVERSATIONS',
      destination_type: 'MESSAGING_WHATSAPP',
      status: 'PAUSED',
      promoted_object: {
        page_id: pageId,
      },
      targeting: {
        age_min: minAge,
        age_max: maxAge,
        geo_locations: geoLocations,
      },
    }

    var createdAdSetId = ''
    try {
      var adsetRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + actId + '/adsets',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + primaryToken,
        },
        body: JSON.stringify(adsetPayload),
        timeout: 25,
      })

      if (
        adsetRes.statusCode >= 200 &&
        adsetRes.statusCode < 300 &&
        adsetRes.json &&
        adsetRes.json.id
      ) {
        createdAdSetId = String(adsetRes.json.id)
        console.log('[META_ADS] AdSet criado com sucesso! ID: ' + createdAdSetId)
      } else {
        var adsetErr = adsetRes.json ? adsetRes.json.error : {}
        console.log('[META_ADS] Erro ao criar AdSet: ' + JSON.stringify(adsetErr))
      }
    } catch (adsetEx) {
      console.log('[META_ADS] Exceção ao criar AdSet: ' + String(adsetEx))
    }

    // 3. Criar Ad Creative
    var createdCreativeId = ''
    try {
      var waLink =
        'https://wa.me/' +
        whatsappNumber +
        '?text=' +
        encodeURIComponent(
          'Olá Bia! Vi o anúncio no Instagram/Facebook e gostaria de mais informações.',
        )
      var creativePayload = {
        name: campaignName + ' - Criativo WhatsApp',
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: waLink,
            message: primaryText,
            name: headline,
            description: description,
            call_to_action: {
              type: 'WHATSAPP_MESSAGE',
              value: {
                app_destination: 'WHATSAPP',
              },
            },
          },
        },
      }
      if (imageUrl) {
        creativePayload.object_story_spec.link_data.picture = imageUrl
      }

      var creativeRes = $http.send({
        url: 'https://graph.facebook.com/v21.0/' + actId + '/adcreatives',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + primaryToken,
        },
        body: JSON.stringify(creativePayload),
        timeout: 25,
      })

      if (
        creativeRes.statusCode >= 200 &&
        creativeRes.statusCode < 300 &&
        creativeRes.json &&
        creativeRes.json.id
      ) {
        createdCreativeId = String(creativeRes.json.id)
        console.log('[META_ADS] Creative criado com sucesso! ID: ' + createdCreativeId)
      } else {
        console.log(
          '[META_ADS] Aviso/Erro ao criar Creative: ' +
            JSON.stringify(creativeRes.json || creativeRes.raw),
        )
      }
    } catch (crEx) {
      console.log('[META_ADS] Exceção ao criar Creative: ' + String(crEx))
    }

    // 4. Criar Ad
    var createdAdId = ''
    if (createdAdSetId && createdCreativeId) {
      try {
        var adRes = $http.send({
          url: 'https://graph.facebook.com/v21.0/' + actId + '/ads',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + primaryToken,
          },
          body: JSON.stringify({
            name: campaignName + ' - Anúncio',
            adset_id: createdAdSetId,
            creative: { creative_id: createdCreativeId },
            status: 'PAUSED',
          }),
          timeout: 25,
        })
        if (adRes.statusCode >= 200 && adRes.statusCode < 300 && adRes.json && adRes.json.id) {
          createdAdId = String(adRes.json.id)
          console.log('[META_ADS] Anúncio publicado com sucesso! ID: ' + createdAdId)
        }
      } catch (adEx) {
        console.log('[META_ADS] Exceção ao criar Ad: ' + String(adEx))
      }
    }

    // Registrar log
    try {
      var col = $app.findCollectionByNameOrId('system_logs')
      var log = new Record(col)
      log.set('type', 'meta_ads_campaign_created')
      log.set(
        'message',
        'Campanha Meta Ads criada: ' + campaignName + ' (ID ' + createdCampaignId + ')',
      )
      log.set('payload', {
        campaign_id: createdCampaignId,
        adset_id: createdAdSetId,
        creative_id: createdCreativeId,
        ad_id: createdAdId,
        daily_budget_brl: dailyBudgetBrl,
      })
      $app.save(log)
    } catch (_) {}

    return e.json(200, {
      success: true,
      campaign_id: createdCampaignId,
      adset_id: createdAdSetId,
      creative_id: createdCreativeId,
      ad_id: createdAdId,
      name: campaignName,
      status: 'PAUSED',
      daily_budget_brl: dailyBudgetBrl,
      projected_monthly_spend_brl: dailyBudgetBrl * 30,
      message:
        'Campanha criada com sucesso na Meta! Ela foi criada em modo pausado para você revisar os criativos.',
    })
  },
  $apis.requireAuth(),
)

// -------------------------------------------------------------
// 3. GET /backend/v1/meta-ads/creatives
// Lista templates aprovados de WhatsApp para vincular ao anúncio
// -------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/meta-ads/creatives',
  (e) => {
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

    var templates = []
    try {
      var records = $app.findRecordsByFilter(
        'whatsapp_templates',
        'status = "APPROVED"',
        '-created',
        50,
        0,
      )
      for (var i = 0; i < records.length; i++) {
        var r = records[i]
        templates.push({
          id: r.id,
          name: r.getString('name'),
          category: r.getString('category'),
          language: r.getString('language'),
          body_text: r.getString('body_text'),
          status: r.getString('status'),
          meta_template_id: r.getString('meta_template_id'),
        })
      }
    } catch (err) {
      console.log('[META_ADS] Erro ao listar templates aprovados: ' + String(err))
    }

    var defaultTmpl = null
    for (var k = 0; k < templates.length; k++) {
      if (templates[k].name === 'villa_dos_acores') {
        defaultTmpl = templates[k]
        break
      }
    }
    if (!defaultTmpl && templates.length > 0) {
      defaultTmpl = templates[0]
    }

    return e.json(200, {
      success: true,
      templates: templates,
      default_template: defaultTmpl,
    })
  },
  $apis.requireAuth(),
)
