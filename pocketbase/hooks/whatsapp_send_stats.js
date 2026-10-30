// Endpoint agregado de raio-x de envios: GET /backend/v1/whatsapp-send-stats
// Responde as métricas exatas dos últimos 7 dias:
// - enviadas (contando logs whatsapp_ai_send)
// - clientes distintos contactados (telefones únicos / customer_ids)
// - entregues (whatsapp_status_delivered)
// - lidas (whatsapp_status_read)
// - falhas (whatsapp_status_failed)
// - outros (whatsapp_status_other)
// - recebidas_de_clientes (conversations sender='customer')
// - breakdown diário dos últimos 7 dias com clientes distintos
// - lista nominal recente (nome a nome de quem recebeu o quê, data/hora e status)
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
    var daysCustomerSet = {}
    for (var d = 6; d >= 0; d--) {
      var dDate = new Date(nowMs - d * 24 * 60 * 60 * 1000)
      var dStr = dDate.toISOString().split('T')[0]
      daysMap[dStr] = {
        date: dStr,
        enviadas: 0,
        clientes_distintos: 0,
        entregues: 0,
        lidas: 0,
        falhas: 0,
        outros: 0,
        recebidas_de_clientes: 0,
      }
      daysCustomerSet[dStr] = {}
    }

    var totalEnviadas = 0
    var totalEntregues = 0
    var totalLidas = 0
    var totalFalhas = 0
    var totalOutros = 0
    var totalRecebidasClientes = 0
    var distinctCustomersMap = {}

    // Mapas de status por wamid e por telefone para correlacionar callbacks da Meta
    var wamidStatusMap = {}
    var phoneStatusMap = {}

    // 2. Coletar status entregues (whatsapp_status_delivered)
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
          var delPayload = deliveredLogs[j].get('payload')
          var delWamid = ''
          var delPhone = ''
          if (delPayload) {
            if (typeof delPayload === 'string') {
              try {
                delPayload = JSON.parse(delPayload)
              } catch (_) {}
            }
            if (typeof delPayload === 'object' && delPayload !== null) {
              delWamid = delPayload.wamid || delPayload.id || ''
              delPhone = String(delPayload.recipient_id || delPayload.wa_id || '').replace(
                /\D/g,
                '',
              )
            }
          }
          if (delWamid) wamidStatusMap[delWamid] = 'entregue'
          if (delPhone && !phoneStatusMap[delPhone]) phoneStatusMap[delPhone] = 'entregue'
        }
      }
    } catch (errDel) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs entregues', 'error', String(errDel))
    }

    // 3. Coletar status lidas (whatsapp_status_read)
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
          var rdPayload = readLogs[k].get('payload')
          var rdWamid = ''
          var rdPhone = ''
          if (rdPayload) {
            if (typeof rdPayload === 'string') {
              try {
                rdPayload = JSON.parse(rdPayload)
              } catch (_) {}
            }
            if (typeof rdPayload === 'object' && rdPayload !== null) {
              rdWamid = rdPayload.wamid || rdPayload.id || ''
              rdPhone = String(rdPayload.recipient_id || rdPayload.wa_id || '').replace(/\D/g, '')
            }
          }
          if (rdWamid) wamidStatusMap[rdWamid] = 'lida'
          if (rdPhone) phoneStatusMap[rdPhone] = 'lida'
        }
      }
    } catch (errRead) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs lidas', 'error', String(errRead))
    }

    // 4. Coletar status falhas (whatsapp_status_failed)
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
          var flPayload = failedLogs[l].get('payload')
          var flWamid = ''
          var flPhone = ''
          if (flPayload) {
            if (typeof flPayload === 'string') {
              try {
                flPayload = JSON.parse(flPayload)
              } catch (_) {}
            }
            if (typeof flPayload === 'object' && flPayload !== null) {
              flWamid = flPayload.wamid || flPayload.id || ''
              flPhone = String(flPayload.recipient_id || flPayload.wa_id || '').replace(/\D/g, '')
            }
          }
          if (flWamid && !wamidStatusMap[flWamid]) wamidStatusMap[flWamid] = 'falhou'
          if (flPhone && !phoneStatusMap[flPhone]) phoneStatusMap[flPhone] = 'falhou'
        }
      }
    } catch (errFail) {
      $app
        .logger()
        .error('whatsapp-send-stats: erro ao buscar logs falhas', 'error', String(errFail))
    }

    // 5. Coletar status outros (whatsapp_status_other, ex: sent)
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

    // 6. Coletar mensagens recebidas de clientes (conversations sender='customer') nos últimos 7 dias
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

    // Cache de clientes na memória para resolver nome e telefone rapidamente
    var customerNameCache = {}
    try {
      var allCusts = $app.findRecordsByFilter('customers', 'id != ""', '-created', 1000, 0)
      if (allCusts) {
        for (var c = 0; c < allCusts.length; c++) {
          var cId = allCusts[c].id
          var cName = allCusts[c].getString('name') || ''
          var cPhone = (allCusts[c].getString('phone') || '').replace(/\D/g, '')
          customerNameCache[cId] = { name: cName, phone: cPhone }
          if (cPhone) {
            customerNameCache['phone_' + cPhone] = { id: cId, name: cName }
          }
        }
      }
    } catch (_) {}

    // 1. Processar logs de envio (whatsapp_ai_send)
    var recipientsList = []
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
          var logRec = sendLogs[i]
          var logCreated = logRec.getString('created') || ''
          var dateKey = logCreated.split('T')[0] || logCreated.split(' ')[0]
          if (daysMap[dateKey]) {
            daysMap[dateKey].enviadas++
          }

          var detailsObj = null
          var rawDetails = logRec.getString('details') || ''
          if (rawDetails) {
            try {
              detailsObj = JSON.parse(rawDetails)
            } catch (_) {}
          }

          var payloadObj = null
          var rawPayload = logRec.get('payload')
          if (rawPayload) {
            if (typeof rawPayload === 'string') {
              try {
                payloadObj = JSON.parse(rawPayload)
              } catch (_) {}
            } else if (typeof rawPayload === 'object') {
              payloadObj = rawPayload
            }
          }

          // Extrair destinatário, wamid e cliente
          var targetPhone = ''
          var customerId = ''
          var step = ''
          var preview = ''
          var wamid = ''
          var isSuccess = true

          if (detailsObj) {
            targetPhone = String(detailsObj.to || detailsObj.recipient_id || '').replace(/\D/g, '')
            customerId = detailsObj.customer_id || ''
            step = detailsObj.step || ''
            if (detailsObj.statusCode && detailsObj.statusCode >= 400) {
              isSuccess = false
            }
            if (
              detailsObj.response &&
              detailsObj.response.messages &&
              detailsObj.response.messages[0]
            ) {
              wamid = detailsObj.response.messages[0].id || ''
            }
          }

          if (payloadObj) {
            if (!targetPhone && payloadObj.to) {
              targetPhone = String(payloadObj.to).replace(/\D/g, '')
            }
            if (!customerId && payloadObj.customer_id) {
              customerId = payloadObj.customer_id
            }
            if (!step && payloadObj.follow_up_step) {
              step = payloadObj.follow_up_step
            }
            preview = payloadObj.preview || payloadObj.full_text || ''
          }

          if (!targetPhone) {
            var msgStr = logRec.getString('message') || ''
            var phoneMatch = msgStr.match(/(\d{10,14})/)
            if (phoneMatch) targetPhone = phoneMatch[1]
            if (msgStr.indexOf('Falha') === 0) isSuccess = false
          }

          // Resolver nome do cliente
          var resolvedName = ''
          if (customerId && customerNameCache[customerId]) {
            resolvedName = customerNameCache[customerId].name
            if (!targetPhone) targetPhone = customerNameCache[customerId].phone
          } else if (targetPhone && customerNameCache['phone_' + targetPhone]) {
            resolvedName = customerNameCache['phone_' + targetPhone].name
            if (!customerId) customerId = customerNameCache['phone_' + targetPhone].id
          }

          // Contabilizar clientes distintos
          var distinctKey = customerId || targetPhone || 'anon_' + i
          distinctCustomersMap[distinctKey] = true
          if (dateKey && daysCustomerSet[dateKey]) {
            daysCustomerSet[dateKey][distinctKey] = true
          }

          // Determinar status do envio (lida > entregue > enviada / falhou)
          var currentStatus = 'enviada'
          if (!isSuccess) {
            currentStatus = 'falhou'
          } else if (wamid && wamidStatusMap[wamid]) {
            currentStatus = wamidStatusMap[wamid]
          } else if (targetPhone && phoneStatusMap[targetPhone]) {
            currentStatus = phoneStatusMap[targetPhone]
          }

          // Armazenar item da lista nominal (limite de 100 itens mais recentes para resposta rápida)
          if (recipientsList.length < 100) {
            recipientsList.push({
              id: logRec.id,
              customer_id: customerId,
              customer_name: resolvedName || (targetPhone ? 'WhatsApp ' + targetPhone : 'Cliente'),
              customer_phone: targetPhone,
              text_preview: preview
                ? preview.substring(0, 110)
                : logRec.getString('message') || 'Disparo da régua',
              sent_at: logCreated,
              status: currentStatus,
              wamid: wamid,
              step: step,
            })
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

    // Atualizar clientes distintos por dia
    var sortedKeys = Object.keys(daysMap).sort()
    var dailyList = []
    for (var p = 0; p < sortedKeys.length; p++) {
      var dKey = sortedKeys[p]
      daysMap[dKey].clientes_distintos = Object.keys(daysCustomerSet[dKey] || {}).length
      dailyList.push(daysMap[dKey])
    }

    var totalDistintos = Object.keys(distinctCustomersMap).length

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
        clientes_distintos: totalDistintos,
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
      recipients: recipientsList,
    })
  },
  $apis.requireAuth(),
)
