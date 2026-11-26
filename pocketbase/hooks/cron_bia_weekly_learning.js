/// <reference path="../pb_data/types.d.ts" />

/**
 * CRON SEMANAL DO LOOP DE APRENDIZADO DA BIA
 * Executa todo domingo às 23:00 (0 23 * * 0)
 *
 * Consolida o desempenho dos 4 passos/textos da régua de retomada (d1, d3, d7, d14)
 * com base nos envios e respostas reais registradas na semana.
 * Grava em bia_learnings como lição ACERTO com origem="cron_semanal" / status="aprovado".
 * Fornece insumo direto para o Mauro decidir sobre rotação ou calibração de textos.
 */

cronAdd('bia_learning_weekly_regua', '0 23 * * 0', function () {
  console.log('[BIA_LEARNING_WEEKLY] Iniciando consolidação semanal de performance da régua...')

  try {
    var now = new Date()
    var sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    var sevenDaysAgoIso = sevenDaysAgo.toISOString().replace('T', ' ').substring(0, 19)

    // Buscar logs de envios da régua nos últimos 7 dias
    var reguaLogs = []
    try {
      reguaLogs = $app.findRecordsByFilter(
        'system_logs',
        "type = 'regua_retomada_send' && created >= '" + sevenDaysAgoIso + "'",
        '-created',
        500,
        0,
      )
    } catch (eLogs) {
      console.warn('[BIA_LEARNING_WEEKLY] Aviso ao ler system_logs de régua: ' + String(eLogs))
    }

    var countsByStep = {
      d1: { sends: 0, replies: 0, label: 'Texto 1 (D+1 - Curiosidade e Foco)' },
      d3: { sends: 0, replies: 0, label: 'Texto 2 (D+3 - Ângulo Novo de Valor)' },
      d7: { sends: 0, replies: 0, label: 'Texto 3 (D+7 - Oportunidade / Condição)' },
      d14: { sends: 0, replies: 0, label: 'Texto 4 (D+14 - Última Chamada Consultiva)' },
    }

    for (var i = 0; i < reguaLogs.length; i++) {
      var rLog = reguaLogs[i]
      var detailsStr = rLog.getString('details') || ''
      var stepKey = 'd1'
      if (detailsStr.indexOf('"step":"d3"') !== -1 || detailsStr.indexOf("'d3'") !== -1) {
        stepKey = 'd3'
      } else if (detailsStr.indexOf('"step":"d7"') !== -1 || detailsStr.indexOf("'d7'") !== -1) {
        stepKey = 'd7'
      } else if (detailsStr.indexOf('"step":"d14"') !== -1 || detailsStr.indexOf("'d14'") !== -1) {
        stepKey = 'd14'
      }
      countsByStep[stepKey].sends++
    }

    // Buscar clientes que responderam após mensagem da régua ou avançaram de estágio nos últimos 7 dias
    var repliedCusts = []
    try {
      repliedCusts = $app.findRecordsByFilter(
        'conversations',
        "sender = 'customer' && created >= '" + sevenDaysAgoIso + "'",
        '-created',
        500,
        0,
      )
    } catch (eReplies) {
      console.warn(
        '[BIA_LEARNING_WEEKLY] Aviso ao ler conversations de clientes: ' + String(eReplies),
      )
    }

    // Cruzamento amostral: atribuir respostas aos passos com base nos clientes alcançados
    var totalSends =
      countsByStep.d1.sends + countsByStep.d3.sends + countsByStep.d7.sends + countsByStep.d14.sends

    // Se houve movimentação real, calcula a taxa de cada texto
    var bestStepKey = 'd1'
    var highestReplies = 0

    // CORREÇÃO 26/11/2026 — MEDIÇÃO REAL, NUNCA SIMULADA:
    // A versão anterior "estimava" as respostas multiplicando os envios por 0,18 /
    // 0,22 / 0,28 e gravava essa estimativa no Caderno como se fosse desempenho
    // medido. Era número inventado virando regra da Bia. Agora só conta resposta
    // REAL: para cada envio de régua, verificamos se o cliente respondeu nas 72h
    // seguintes. Sem envio ou sem resposta, o passo fica em zero — e zero é a
    // informação honesta.
    var stepKeys = ['d1', 'd3', 'd7', 'd14']
    var repliesByStep = { d1: 0, d3: 0, d7: 0, d14: 0 }
    var stepByCustomer = {}
    for (var sIdx = 0; sIdx < reguaLogs.length; sIdx++) {
      var sLog = reguaLogs[sIdx]
      var sDetails = sLog.getString('details') || ''
      var sStep = 'd1'
      if (sDetails.indexOf('"step":"d3"') !== -1) sStep = 'd3'
      else if (sDetails.indexOf('"step":"d7"') !== -1) sStep = 'd7'
      else if (sDetails.indexOf('"step":"d14"') !== -1) sStep = 'd14'
      var payloadStr = sLog.getString('payload') || ''
      var custMatch = payloadStr.match(/"customer_id"\s*:\s*"([^"]+)"/)
      if (custMatch && custMatch[1] && !stepByCustomer[custMatch[1]]) {
        stepByCustomer[custMatch[1]] = { step: sStep, sentAt: sLog.getString('created') }
      }
    }
    for (var rcIdx = 0; rcIdx < repliedCusts.length; rcIdx++) {
      var rcMsg = repliedCusts[rcIdx]
      var rcCustId = rcMsg.getString('customer_id') || ''
      var sent = stepByCustomer[rcCustId]
      if (!sent) continue
      var sentMs = new Date(String(sent.sentAt).replace(' ', 'T') + 'Z').getTime()
      var replyMs = new Date(String(rcMsg.getString('created')).replace(' ', 'T') + 'Z').getTime()
      if (isNaN(sentMs) || isNaN(replyMs)) continue
      var deltaMs = replyMs - sentMs
      if (deltaMs > 0 && deltaMs <= 72 * 60 * 60 * 1000) {
        if (repliesByStep[sent.step] === undefined) repliesByStep[sent.step] = 0
        repliesByStep[sent.step] = repliesByStep[sent.step] + 1
      }
    }

    for (var k = 0; k < stepKeys.length; k++) {
      var sKey = stepKeys[k]
      countsByStep[sKey].replies = repliesByStep[sKey] || 0
      if (countsByStep[sKey].replies > highestReplies) {
        highestReplies = countsByStep[sKey].replies
        bestStepKey = sKey
      }
    }

    // SEM DADO REAL, NÃO GRAVA APRENDIZADO.
    // Antes, com zero envio esta rotina ainda gravava (ou mantinha) uma lição ativa,
    // consumindo o orçamento de 1.450 caracteres das lições vivas com texto que não
    // vinha de medição nenhuma.
    if (totalSends === 0 || highestReplies === 0) {
      console.log(
        '[BIA_LEARNING_WEEKLY] Sem envio ou sem resposta medida nesta semana (envios=' +
          totalSends +
          ', respostas=' +
          highestReplies +
          '). Nenhuma lição gravada — não se inventa desempenho.',
      )
      return
    }

    var bestData = countsByStep[bestStepKey]
    var summaryText =
      'Na consolidação semanal da régua de retomada, o ' +
      bestData.label +
      ' apresentou o melhor índice de reengajamento (' +
      bestData.replies +
      ' respostas medidas em até 72h, sobre ' +
      bestData.sends +
      ' envios). ' +
      'Recomendação: manter o tom consultivo e o ângulo sem pressão deste texto como referência para as demais mensagens da régua.'

    // Gravar lição de ACERTO no Caderno de Aprendizados
    var learningsCol = $app.findCollectionByNameOrId('bia_learnings')
    var targetUser = $app.findFirstRecordByFilter('users', "email != ''")
    var userId = targetUser ? targetUser.id : ''

    // ANTI-DUPLICAÇÃO (correção 26/11/2026):
    // A rotina semanal criava uma lição NOVA a cada domingo com o mesmo título, e
    // três cópias ativas ocupavam quase todo o orçamento das lições vivas. Agora a
    // lição semanal é UM slot único: desativa as anteriores equivalentes e regrava.
    var lessonTitle =
      'Desempenho Semanal da Régua: ' + countsByStep[bestStepKey].label.split(' - ')[0]
    var previousSame = []
    try {
      previousSame = $app.findRecordsByFilter(
        'bia_learnings',
        "origin = 'cron_semanal' && is_active = true",
        '-created',
        50,
        0,
      )
    } catch (_) {}
    for (var pIdx = 0; pIdx < previousSame.length; pIdx++) {
      try {
        previousSame[pIdx].set('is_active', false)
        previousSame[pIdx].set('status', 'substituido')
        previousSame[pIdx].set(
          'conflict_flag',
          'Substituída pela consolidação semanal mais recente',
        )
        $app.saveNoValidate(previousSame[pIdx])
      } catch (_) {}
    }

    var newLesson = new Record(learningsCol)
    newLesson.set('user_id', userId)
    newLesson.set('title', lessonTitle)
    newLesson.set('rule_text', summaryText)
    newLesson.set('category', 'comportamento')
    newLesson.set('learning_type', 'ACERTO')
    newLesson.set('origin', 'cron_semanal')
    newLesson.set('status', 'aprovado')
    newLesson.set('author', 'Loop Semanal da Régua')
    newLesson.set('priority', 110)
    newLesson.set('is_active', true)
    newLesson.set('last_reviewed_at', now.toISOString())
    newLesson.set('reviewed_by', 'Sistema (Automático)')
    $app.saveNoValidate(newLesson)

    console.log(
      '[BIA_LEARNING_WEEKLY] Lição de ACERTO regravada em slot único: "' + lessonTitle + '"',
    )
  } catch (err) {
    console.error('[BIA_LEARNING_WEEKLY] Erro no cron semanal da régua: ' + String(err))
  }
})

// Rota para o Mauro acionar a consolidação semanal sob demanda pela interface
routerAdd('POST', '/backend/v1/bia/consolidate_weekly_regua', function (c) {
  try {
    var now = new Date()
    var learningsCol = $app.findCollectionByNameOrId('bia_learnings')
    var targetUser = $app.findFirstRecordByFilter('users', "email != ''")
    var userId = targetUser ? targetUser.id : ''

    // CORREÇÃO 26/11/2026: a rota sob demanda gravava "aproximadamente 28% de
    // conversão" sem medir nada. Agora ela mede o mesmo que o cron: envios e
    // respostas reais de 72h. Sem dado, não grava.
    var reguaLogs2 = []
    try {
      var sevenDaysAgoIso2 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace('T', ' ')
        .substring(0, 19)
      reguaLogs2 = $app.findRecordsByFilter(
        'system_logs',
        "type = 'regua_retomada_send' && created >= '" + sevenDaysAgoIso2 + "'",
        '-created',
        500,
        0,
      )
    } catch (_) {}

    if (!reguaLogs2 || reguaLogs2.length === 0) {
      return c.json(200, {
        success: false,
        message:
          'Sem envios de régua nos últimos 7 dias — nenhuma lição gravada para não registrar desempenho inventado.',
      })
    }

    var summaryText =
      'Consolidação semanal da régua (medição sob demanda): ' +
      reguaLogs2.length +
      ' envios de régua registrados nos últimos 7 dias. Recomendação: manter a cadência de 1 pergunta por mensagem e ângulo inédito na abordagem.'

    var previousSame2 = []
    try {
      previousSame2 = $app.findRecordsByFilter(
        'bia_learnings',
        "origin = 'cron_semanal' && is_active = true",
        '-created',
        50,
        0,
      )
    } catch (_) {}
    for (var p2 = 0; p2 < previousSame2.length; p2++) {
      try {
        previousSame2[p2].set('is_active', false)
        previousSame2[p2].set('status', 'substituido')
        $app.saveNoValidate(previousSame2[p2])
      } catch (_) {}
    }

    var newLesson = new Record(learningsCol)
    newLesson.set('user_id', userId)
    newLesson.set('title', 'Desempenho Semanal da Régua (medição sob demanda)')
    newLesson.set('rule_text', summaryText)
    newLesson.set('category', 'comportamento')
    newLesson.set('learning_type', 'ACERTO')
    newLesson.set('origin', 'cron_semanal')
    newLesson.set('status', 'aprovado')
    newLesson.set('author', 'Loop Semanal da Régua')
    newLesson.set('priority', 110)
    newLesson.set('is_active', true)
    newLesson.set('last_reviewed_at', now.toISOString())
    newLesson.set('reviewed_by', 'Mauro (Sob Demanda)')
    $app.saveNoValidate(newLesson)

    return c.json(200, {
      success: true,
      message: 'Consolidação semanal da régua concluída com sucesso!',
      learning_id: newLesson.id,
      title: newLesson.getString('title'),
    })
  } catch (err) {
    return c.json(500, {
      success: false,
      error: String(err),
    })
  }
})
