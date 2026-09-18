// Endpoint agregado: GET /backend/v1/whatsapp-stats
// Calcula métricas de atendimento WhatsApp, campanhas, custos Meta (atual vs 01/10) e saúde técnica

routerAdd(
  'GET',
  '/backend/v1/whatsapp-stats',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var userRecord = null
    try {
      userRecord = $app.findRecordById('users', userId)
    } catch (_) {
      return e.notFoundError('Usuário não encontrado')
    }

    var now = new Date()
    var nowMs = now.getTime()
    var thirtyDaysAgo = new Date(nowMs - 30 * 24 * 60 * 60 * 1000)
    var thirtyDaysAgoStr = thirtyDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

    // Início do mês atual (UTC aproximado)
    var startOfCurrentMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0),
    )
    var startOfCurrentMonthStr = startOfCurrentMonth
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19)

    // 1. Obter ou criar settings do usuário
    var settingsRecord = null
    try {
      var found = $app.findRecordsByFilter(
        'wa_stats_settings',
        'user_id = {:uid}',
        '-created',
        1,
        0,
        { uid: userId },
      )
      if (found && found.length > 0) {
        settingsRecord = found[0]
      }
    } catch (_) {}

    if (!settingsRecord) {
      try {
        var col = $app.findCollectionByNameOrId('wa_stats_settings')
        settingsRecord = new Record(col)
        settingsRecord.set('user_id', userId)
        settingsRecord.set('usd_to_brl_rate', 5.65)
        settingsRecord.set('marketing_rate_usd', 0.0625)
        settingsRecord.set('service_rate_usd', 0.008)
        settingsRecord.set('monthly_leads_goal', 50)
        settingsRecord.set('monthly_investment_budget_brl', 300)
        $app.save(settingsRecord)
      } catch (_) {}
    }

    var usdToBrl = settingsRecord ? settingsRecord.getFloat('usd_to_brl_rate') || 5.65 : 5.65
    var marketingRateUsd = settingsRecord
      ? settingsRecord.getFloat('marketing_rate_usd') || 0.0625
      : 0.0625
    var serviceRateUsd = settingsRecord
      ? settingsRecord.getFloat('service_rate_usd') || 0.008
      : 0.008
    var monthlyLeadsGoal = settingsRecord ? settingsRecord.getInt('monthly_leads_goal') || 50 : 50
    var monthlyInvestmentBudgetBrl = settingsRecord
      ? settingsRecord.getFloat('monthly_investment_budget_brl') || 300
      : 300

    var marketingRateBrl = marketingRateUsd * usdToBrl
    var serviceRateBrl = serviceRateUsd * usdToBrl

    // 2. Coletar conversas (últimos 30 dias e geral)
    // Buscamos com limite generoso para calcular métricas com precisão
    var conversations = []
    try {
      conversations = $app.findRecordsByFilter(
        'conversations',
        'created >= {:date}',
        '-created',
        2000,
        0,
        { date: thirtyDaysAgoStr },
      )
    } catch (err) {
      $app.logger().error('wa_stats: error fetching conversations', 'error', String(err))
    }

    // Classificação das mensagens
    var totalSent30d = 0 // enviadas por ai ou agent
    var serviceSent30d = 0 // serviço (Bia/corretor nas conversas)
    var incomingReceived30d = 0 // customer
    var customerIdsWithReplies = {}
    var customerIdsTotalIn30d = {}
    var active24hCustomerIds = {}
    var oneDayAgoMs = nowMs - 24 * 60 * 60 * 1000

    // Volume diário dos últimos 30 dias: chave YYYY-MM-DD -> { sent, received }
    var dailyVolumeMap = {}
    // Inicializa os últimos 30 dias com 0
    for (var d = 29; d >= 0; d--) {
      var dDate = new Date(nowMs - d * 24 * 60 * 60 * 1000)
      var dStr = dDate.toISOString().split('T')[0]
      dailyVolumeMap[dStr] = { date: dStr, sent: 0, received: 0, leads: 0 }
    }

    for (var i = 0; i < conversations.length; i++) {
      var c = conversations[i]
      var sender = c.getString('sender')
      var cCreated = c.getString('created')
      var cTime = new Date(cCreated).getTime()
      var cDateStr = cCreated.split('T')[0] || cCreated.split(' ')[0]
      var custId = c.getString('customer_id')

      if (custId) {
        customerIdsTotalIn30d[custId] = true
        if (cTime >= oneDayAgoMs) {
          active24hCustomerIds[custId] = true
        }
      }

      if (sender === 'ai' || sender === 'agent') {
        totalSent30d++
        serviceSent30d++
        if (dailyVolumeMap[cDateStr]) {
          dailyVolumeMap[cDateStr].sent++
        }
      } else if (sender === 'customer') {
        incomingReceived30d++
        if (custId) {
          customerIdsWithReplies[custId] = true
        }
        if (dailyVolumeMap[cDateStr]) {
          dailyVolumeMap[cDateStr].received++
        }
      }
    }

    // Contagem de mensagens de serviço no mês corrente (para o limite de 1.000 grátis pós-01/10)
    var serviceMessagesCurrentMonth = 0
    try {
      var currentMonthConvs = $app.findRecordsByFilter(
        'conversations',
        "created >= {:start} && (sender = 'ai' || sender = 'agent')",
        '-created',
        2000,
        0,
        { start: startOfCurrentMonthStr },
      )
      serviceMessagesCurrentMonth = currentMonthConvs ? currentMonthConvs.length : 0
    } catch (_) {}

    // 3. Coletar novos leads (customers criados nos últimos 30 dias)
    var newLeads30d = 0
    var adReferralLeads30d = 0
    var leadsCurrentMonth = 0
    try {
      var custs30d = $app.findRecordsByFilter(
        'customers',
        'created >= {:date}',
        '-created',
        1000,
        0,
        { date: thirtyDaysAgoStr },
      )
      for (var k = 0; k < custs30d.length; k++) {
        var cust = custs30d[k]
        newLeads30d++
        var custCreated = cust.getString('created')
        var custDateStr = custCreated.split('T')[0] || custCreated.split(' ')[0]
        if (dailyVolumeMap[custDateStr]) {
          dailyVolumeMap[custDateStr].leads++
        }
        if (new Date(custCreated).getTime() >= startOfCurrentMonth.getTime()) {
          leadsCurrentMonth++
        }
        var custSource = (cust.getString('source') || '').toLowerCase()
        var custNotes = (cust.getString('notes') || '').toLowerCase()
        if (
          custSource.indexOf('anúncio') !== -1 ||
          custSource.indexOf('anuncio') !== -1 ||
          custSource.indexOf('meta') !== -1 ||
          custNotes.indexOf('origem: anúncio') !== -1 ||
          custNotes.indexOf('origem: anuncio') !== -1
        ) {
          adReferralLeads30d++
        }
      }
    } catch (err) {
      $app.logger().error('wa_stats: error fetching customers', 'error', String(err))
    }

    // 4. Coletar campanhas de remarketing WhatsApp
    var campaignsData = []
    var totalCampaignSent30d = 0
    var totalCampaignDelivered30d = 0
    var totalCampaignFailed30d = 0
    var totalCampaignCostBrl30d = 0

    try {
      var campaigns = $app.findRecordsByFilter('remarketing_campaigns', '', '-created', 50, 0)

      for (var m = 0; m < campaigns.length; m++) {
        var camp = campaigns[m]
        var campId = camp.id
        var campName = camp.getString('name')
        var campDate = camp.getString('created')
        var campSegment = camp.getString('segment') || 'Todos'
        var sentCount = camp.getInt('sent_count') || 0
        var deliveredCount = camp.getInt('delivered_count') || 0
        var failedCount = camp.getInt('failed_count') || 0
        var totalRecipients = camp.getInt('total_recipients') || sentCount + failedCount

        // Contar respostas: mensagens de clientes recebidas APÓS a data da campanha para os destinatários dessa campanha
        var repliesCount = 0
        try {
          var recipients = $app.findRecordsByFilter(
            'remarketing_recipients',
            'campaign_id = {:cid} && status != "failed"',
            '-created',
            500,
            0,
            { cid: campId },
          )
          var campTime = new Date(campDate).getTime()
          var recipientCustomerIds = {}
          for (var r = 0; r < recipients.length; r++) {
            var rcId = recipients[r].getString('customer_id')
            if (rcId) recipientCustomerIds[rcId] = true
          }
          var rKeys = Object.keys(recipientCustomerIds)
          for (var rk = 0; rk < rKeys.length; rk++) {
            var cidKey = rKeys[rk]
            var custReplies = $app.findRecordsByFilter(
              'conversations',
              'customer_id = {:cid} && sender = "customer" && created >= {:ctime}',
              '-created',
              1,
              0,
              { cid: cidKey, ctime: campDate },
            )
            if (custReplies && custReplies.length > 0) {
              repliesCount++
            }
          }
        } catch (_) {}

        var responseRatePercent =
          sentCount > 0 ? Math.round((repliesCount / sentCount) * 1000) / 10 : 0
        // Custo por mensagem de marketing entregue (ou enviada se delivered ainda não reportado)
        var billableCount = deliveredCount > 0 ? deliveredCount : sentCount
        var campCostBrl = billableCount * marketingRateBrl
        var costPerReplyBrl = repliesCount > 0 ? campCostBrl / repliesCount : 0

        var campCreatedTime = new Date(campDate).getTime()
        if (campCreatedTime >= thirtyDaysAgo.getTime()) {
          totalCampaignSent30d += sentCount
          totalCampaignDelivered30d += deliveredCount
          totalCampaignFailed30d += failedCount
          totalCampaignCostBrl30d += campCostBrl
        }

        campaignsData.push({
          id: campId,
          name: campName,
          created: campDate,
          segment: campSegment,
          status: camp.getString('status'),
          total_recipients: totalRecipients,
          sent_count: sentCount,
          delivered_count: deliveredCount,
          failed_count: failedCount,
          replies_count: repliesCount,
          response_rate_percent: responseRatePercent,
          cost_brl: Math.round(campCostBrl * 100) / 100,
          cost_per_reply_brl: Math.round(costPerReplyBrl * 100) / 100,
        })
      }
    } catch (err) {
      $app.logger().error('wa_stats: error fetching campaigns', 'error', String(err))
    }

    // 5. Cálculos de taxas e custos globais
    var uniqueCustomersTotal = Object.keys(customerIdsTotalIn30d).length
    var uniqueCustomersReplied = Object.keys(customerIdsWithReplies).length
    var globalResponseRate =
      uniqueCustomersTotal > 0
        ? Math.round((uniqueCustomersReplied / uniqueCustomersTotal) * 1000) / 10
        : 0
    var activeConversations24h = Object.keys(active24hCustomerIds).length

    // CUSTO ATUAL (Setembro / pré 01/10):
    // Mensagens de serviço (Bia) = R$ 0,00 (grátis dentro das 24h)
    // Mensagens de marketing = cobrança normal
    var currentCostBrl30d = Math.round(totalCampaignCostBrl30d * 100) / 100

    // CUSTO PROJETADO PÓS 01/10/2026:
    // Mensagens de marketing = mesma tarifa
    // Mensagens de serviço (Bia): primeiras 1.000 entregas/mês GRÁTIS por número;
    // excedente a US$ 0,008/msg (convertido em BRL)
    // Mensagens de leads vindos de Click-to-WhatsApp (entry point de anúncio) dentro de 72h = 0 custo
    // Estima-se a fração de mensagens que foram de anúncios para aplicar a isenção de 72h
    var adFraction = newLeads30d > 0 ? adReferralLeads30d / newLeads30d : 0.3
    var chargeableServiceMsgs30d = Math.round(serviceSent30d * (1 - adFraction * 0.7)) // desconta leads de anúncio
    var projectedPaidServiceMsgs30d = Math.max(0, chargeableServiceMsgs30d - 1000)
    var projectedServiceCostBrl30d = projectedPaidServiceMsgs30d * serviceRateBrl
    var projectedCostBrl30d =
      Math.round((totalCampaignCostBrl30d + projectedServiceCostBrl30d) * 100) / 100

    // Custo por lead
    var costPerLeadCurrentBrl =
      newLeads30d > 0 ? Math.round((currentCostBrl30d / newLeads30d) * 100) / 100 : 0
    var costPerLeadProjectedBrl =
      newLeads30d > 0 ? Math.round((projectedCostBrl30d / newLeads30d) * 100) / 100 : 0

    // 6. Templates aprovados e saúde da Meta
    var templatesCount = { total: 0, approved: 0, pending: 0, rejected: 0 }
    try {
      var allTemplates = $app.findRecordsByFilter('whatsapp_templates', '', '-created', 100, 0)
      for (var t = 0; t < allTemplates.length; t++) {
        var tmpl = allTemplates[t]
        templatesCount.total++
        var tStat = (tmpl.getString('status') || '').toUpperCase()
        if (tStat === 'APPROVED') templatesCount.approved++
        else if (tStat === 'PENDING') templatesCount.pending++
        else if (tStat === 'REJECTED') templatesCount.rejected++
      }
    } catch (_) {}

    // Status de CAPI e Meta
    var metaTokenStatus = userRecord.getString('meta_token_status') || 'unknown'
    var metaCapiStatus = userRecord.getString('meta_capi_status') || 'unknown'
    var metaCapiError = userRecord.getString('meta_capi_error') || ''
    var metaWhatsappStatus = userRecord.getString('meta_whatsapp_status') || ''
    var metaPhoneId = userRecord.getString('meta_whatsapp_phone_number_id') || ''
    var metaVerifyToken = userRecord.getString('meta_whatsapp_verify_token') || ''
    var metaInstagramToken =
      userRecord.getString('meta_instagram_page_token') ||
      userRecord.getString('meta_instagram_user_token') ||
      ''

    var health = {
      whatsapp_status:
        metaTokenStatus === 'active'
          ? 'connected'
          : metaTokenStatus === 'error'
            ? 'error'
            : 'unknown',
      whatsapp_number: metaWhatsappStatus || '+55 48 9209-8050',
      whatsapp_phone_id_configured: !!metaPhoneId,
      webhook_configured: !!metaVerifyToken,
      capi_status:
        metaCapiStatus === 'connected' || metaCapiStatus === 'active'
          ? 'connected'
          : metaCapiStatus === 'error'
            ? 'error'
            : 'warning',
      capi_error_details: metaCapiError || null,
      instagram_status: metaInstagramToken ? 'connected' : 'pending',
      templates: templatesCount,
    }

    // Ordenar volume diário por data crescente
    var dailyList = []
    var dailyKeys = Object.keys(dailyVolumeMap).sort()
    for (var dk = 0; dk < dailyKeys.length; dk++) {
      dailyList.push(dailyVolumeMap[dailyKeys[dk]])
    }

    // Progresso das metas mensais
    var leadsGoalPercent =
      monthlyLeadsGoal > 0 ? Math.round((leadsCurrentMonth / monthlyLeadsGoal) * 100) : 0
    var investmentSpentCurrentMonth = Math.round(totalCampaignCostBrl30d * 100) / 100
    var investmentGoalPercent =
      monthlyInvestmentBudgetBrl > 0
        ? Math.round((investmentSpentCurrentMonth / monthlyInvestmentBudgetBrl) * 100)
        : 0

    return e.json(200, {
      summary: {
        total_sent_30d: totalSent30d,
        service_sent_30d: serviceSent30d,
        incoming_received_30d: incomingReceived30d,
        total_messages_30d: totalSent30d + incomingReceived30d,
        active_conversations_24h: activeConversations24h,
        unique_customers_contacted_30d: uniqueCustomersTotal,
        unique_customers_replied_30d: uniqueCustomersReplied,
        response_rate_percent: globalResponseRate,
        new_leads_30d: newLeads30d,
        ad_referral_leads_30d: adReferralLeads30d,
        leads_current_month: leadsCurrentMonth,
        current_cost_brl_30d: currentCostBrl30d,
        projected_cost_brl_30d: projectedCostBrl30d,
        cost_per_lead_current_brl: costPerLeadCurrentBrl,
        cost_per_lead_projected_brl: costPerLeadProjectedBrl,
        // Contador de mensagens de serviço no mês atual (regra 1.000 grátis)
        service_messages_current_month: serviceMessagesCurrentMonth,
        service_free_quota: 1000,
        service_free_quota_remaining: Math.max(0, 1000 - serviceMessagesCurrentMonth),
        service_free_quota_percent_used: Math.min(
          100,
          Math.round((serviceMessagesCurrentMonth / 1000) * 100),
        ),
      },
      health: health,
      campaigns: campaignsData,
      daily_history: dailyList,
      settings: {
        id: settingsRecord ? settingsRecord.id : null,
        usd_to_brl_rate: usdToBrl,
        marketing_rate_usd: marketingRateUsd,
        service_rate_usd: serviceRateUsd,
        marketing_rate_brl: Math.round(marketingRateBrl * 10000) / 10000,
        service_rate_brl: Math.round(serviceRateBrl * 10000) / 10000,
        monthly_leads_goal: monthlyLeadsGoal,
        monthly_investment_budget_brl: monthlyInvestmentBudgetBrl,
        leads_goal_percent: leadsGoalPercent,
        investment_goal_percent: investmentGoalPercent,
      },
    })
  },
  $apis.requireAuth(),
)

// Endpoint para atualizar configurações: POST /backend/v1/whatsapp-stats/settings
routerAdd(
  'POST',
  '/backend/v1/whatsapp-stats/settings',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var body = e.requestInfo().body || {}
    var settingsRecord = null

    try {
      var found = $app.findRecordsByFilter(
        'wa_stats_settings',
        'user_id = {:uid}',
        '-created',
        1,
        0,
        { uid: userId },
      )
      if (found && found.length > 0) {
        settingsRecord = found[0]
      }
    } catch (_) {}

    if (!settingsRecord) {
      var col = $app.findCollectionByNameOrId('wa_stats_settings')
      settingsRecord = new Record(col)
      settingsRecord.set('user_id', userId)
    }

    if (body.usd_to_brl_rate !== undefined) {
      settingsRecord.set('usd_to_brl_rate', parseFloat(body.usd_to_brl_rate) || 5.65)
    }
    if (body.marketing_rate_usd !== undefined) {
      settingsRecord.set('marketing_rate_usd', parseFloat(body.marketing_rate_usd) || 0.0625)
    }
    if (body.service_rate_usd !== undefined) {
      settingsRecord.set('service_rate_usd', parseFloat(body.service_rate_usd) || 0.008)
    }
    if (body.monthly_leads_goal !== undefined) {
      settingsRecord.set('monthly_leads_goal', parseInt(body.monthly_leads_goal, 10) || 50)
    }
    if (body.monthly_investment_budget_brl !== undefined) {
      settingsRecord.set(
        'monthly_investment_budget_brl',
        parseFloat(body.monthly_investment_budget_brl) || 300,
      )
    }

    $app.save(settingsRecord)

    return e.json(200, {
      success: true,
      settings: {
        id: settingsRecord.id,
        usd_to_brl_rate: settingsRecord.getFloat('usd_to_brl_rate'),
        marketing_rate_usd: settingsRecord.getFloat('marketing_rate_usd'),
        service_rate_usd: settingsRecord.getFloat('service_rate_usd'),
        monthly_leads_goal: settingsRecord.getInt('monthly_leads_goal'),
        monthly_investment_budget_brl: settingsRecord.getFloat('monthly_investment_budget_brl'),
      },
    })
  },
  $apis.requireAuth(),
)
