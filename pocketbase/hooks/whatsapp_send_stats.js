// Endpoint agregado de raio-x de envios: GET /backend/v1/whatsapp-send-stats
// Responde as métricas dos últimos 7 dias:
// - enviadas (contando logs whatsapp_ai_send)
// - entregues (whatsapp_status_delivered)
// - lidas (whatsapp_status_read)
// - falhas (whatsapp_status_failed)
// - outros (whatsapp_status_other)
// - recebidas_de_clientes (conversations sender='customer')
// - breakdown diário dos últimos 7 dias
// Padrão de proteção: $apis.requireAuth() compatível com os outros endpoints autenticados do CRM

routerAdd(
  'GET',
  '/backend/v1/whatsapp-send-stats',
  (e) => {
    var userId = e.auth ? e.auth.id : ''
    if (!userId) return e.unauthorizedError('auth required')

    var now = new Date()
    var nowMs = now.getTime()
    var sevenDaysAgo = new Date(nowMs - 7 * 24 * 60 * 60 * 1000)
    var sevenDaysAgoIso = sevenDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

    // Inicializa o mapa dos últimos 7 dias (YYYY-MM-DD)
    var daysMap = {}
    for (var d = 6; d >= 0; d--) {
      var dDate = new Date(nowMs - d * 24 * 60 * 60 * 1000)
      var dStr = dDate.toISOString().split('T')[0]
      daysMap[dStr] = {
        date: dStr,
        enviadas: 0,
        entregues: 0,
        lidas: 0,
        falhas: 0,
        outros: 0,
        recebidas_de_clientes: 0,
      }
    }

    var totalEnviadas = 0
    var totalEntregues = 0
    var totalLidas = 0
    var totalFalhas = 0
    var totalOutros = 0
    var totalRecebidasClientes = 0

    // 1. Contar logs de envio (whatsapp_ai_send) nos últimos 7 dias
    try {
      var sendLogs = $app.findRecordsByFilter(
        'system_logs',
        "type = 'whatsapp_ai_send' && created >= {:start}",
        '-created',
        2000,
        0,
        { start: sevenDaysAgoIso },
      )
      if (sendLogs) {
        totalEnviadas = sendLogs.length
        for (var i = 0; i < sendLogs.length; i++) {
          var logCreated = sendLogs[i].getString('created') || ''
          var dateKey = logCreated.split('T')[0] || logCreated.split(' ')[0]
          if (daysMap[dateKey]) {
            daysMap[dateKey].enviadas++
          }
        }
      }
    } catch (errSend) {
      $app
        .logger()
        .error(
          'whatsapp-send-stats: erro ao buscar logs whatsapp_ai_send',
          'error',
          String(errSend),
        )
    }

    // 2. Contar status entregues (whatsapp_status_delivered)
    try {
      var deliveredLogs = $app.findRecordsByFilter(
        'system_logs',
        "type = 'whatsapp_status_delivered' && created >= {:start}",
        '-created',
        2000,
        0,
        { start: sevenDaysAgoIso },
      )
      if (deliveredLogs) {
        totalEntregues = deliveredLogs.length
        for (var j = 0; j < deliveredLogs.length; j++) {
          var delCreated = deliveredLogs[j].getString('created') || ''
          var delKey = delCreated.split('T')[0] || delCreated.split(' ')[0]
          if (daysMap[delKey]) {
            daysMap[delKey].entregues++
          }
        }
      }
    } catch (errDel) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs entregues', 'error', String(errDel))
    }

    // 3. Contar status lidas (whatsapp_status_read)
    try {
      var readLogs = $app.findRecordsByFilter(
        'system_logs',
        "type = 'whatsapp_status_read' && created >= {:start}",
        '-created',
        2000,
        0,
        { start: sevenDaysAgoIso },
      )
      if (readLogs) {
        totalLidas = readLogs.length
        for (var k = 0; k < readLogs.length; k++) {
          var rdCreated = readLogs[k].getString('created') || ''
          var rdKey = rdCreated.split('T')[0] || rdCreated.split(' ')[0]
          if (daysMap[rdKey]) {
            daysMap[rdKey].lidas++
          }
        }
      }
    } catch (errRead) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs lidas', 'error', String(errRead))
    }

    // 4. Contar status falhas (whatsapp_status_failed)
    try {
      var failedLogs = $app.findRecordsByFilter(
        'system_logs',
        "type = 'whatsapp_status_failed' && created >= {:start}",
        '-created',
        2000,
        0,
        { start: sevenDaysAgoIso },
      )
      if (failedLogs) {
        totalFalhas = failedLogs.length
        for (var l = 0; l < failedLogs.length; l++) {
          var flCreated = failedLogs[l].getString('created') || ''
          var flKey = flCreated.split('T')[0] || flCreated.split(' ')[0]
          if (daysMap[flKey]) {
            daysMap[flKey].falhas++
          }
        }
      }
    } catch (errFail) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs falhas', 'error', String(errFail))
    }

    // 5. Contar status outros (whatsapp_status_other, ex: sent)
    try {
      var otherLogs = $app.findRecordsByFilter(
        'system_logs',
        "type = 'whatsapp_status_other' && created >= {:start}",
        '-created',
        2000,
        0,
        { start: sevenDaysAgoIso },
      )
      if (otherLogs) {
        totalOutros = otherLogs.length
        for (var m = 0; m < otherLogs.length; m++) {
          var othCreated = otherLogs[m].getString('created') || ''
          var othKey = othCreated.split('T')[0] || othCreated.split(' ')[0]
          if (daysMap[othKey]) {
            daysMap[othKey].outros++
          }
        }
      }
    } catch (errOth) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs outros', 'error', String(errOth))
    }

    // 6. Contar mensagens recebidas de clientes (conversations sender='customer') nos últimos 7 dias
    try {
      var custConvs = $app.findRecordsByFilter(
        'conversations',
        "sender = 'customer' && created >= {:start}",
        '-created',
        2000,
        0,
        { start: sevenDaysAgoIso },
      )
      if (custConvs) {
        totalRecebidasClientes = custConvs.length
        for (var n = 0; n < custConvs.length; n++) {
          var convCreated = custConvs[n].getString('created') || ''
          var convKey = convCreated.split('T')[0] || convCreated.split(' ')[0]
          if (daysMap[convKey]) {
            daysMap[convKey].recebidas_de_clientes++
          }
        }
      }
    } catch (errConv) {
      $app
        .logger()
        .error(
          'whatsapp-send-stats: erro ao buscar conversas recebidas de clientes',
          'error',
          String(errConv),
        )
    }

    // Ordenar histórico diário por data ascendente
    var dailyList = []
    var sortedKeys = Object.keys(daysMap).sort()
    for (var p = 0; p < sortedKeys.length; p++) {
      dailyList.push(daysMap[sortedKeys[p]])
    }

    // Taxas calculadas
    var taxaEntrega =
      totalEnviadas > 0 ? Math.round((totalEntregues / totalEnviadas) * 1000) / 10 : 0
    var taxaLeitura = totalEntregues > 0 ? Math.round((totalLidas / totalEntregues) * 1000) / 10 : 0
    var taxaResposta =
      totalEnviadas > 0 ? Math.round((totalRecebidasClientes / totalEnviadas) * 1000) / 10 : 0

    return e.json(200, {
      success: true,
      period_days: 7,
      since: sevenDaysAgoIso,
      generated_at: now.toISOString(),
      totals: {
        enviadas: totalEnviadas,
        entregues: totalEntregues,
        lidas: totalLidas,
        falhas: totalFalhas,
        outros: totalOutros,
        recebidas_de_clientes: totalRecebidasClientes,
      },
      rates_percent: {
        taxa_entrega: taxaEntrega,
        taxa_leitura: taxaLeitura,
        taxa_resposta: taxaResposta,
      },
      daily_history: dailyList,
    })
  },
  $apis.requireAuth(),
)
