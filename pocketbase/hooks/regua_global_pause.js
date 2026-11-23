// =============================================================================
// regua_global_pause.js — FASE 1 (pausa emergencial da régua) + Correção 6 (vigia)
// =============================================================================
// PARTE A — PAUSA GLOBAL DE DISPARO PROATIVO:
//   Intercepta em UM ponto único toda saída proativa da Bia:
//   - whatsapp_ai_send       (régua/cadência e qualquer envio proativo via Cloud API)
//   - instagram_send_result  (proativo)
//   - messenger_ai_send      (proativo)
//   Controlado pelo app_controls key='regua_automations_active' (is_active=false
//   = régua pausada). Respostas da Bia a mensagens de cliente (ai_auto_reply,
//   is_reply_to_customer_message=true) NUNCA são bloqueadas — a Bia continua
//   respondendo quem fala com ela.
//
// PARTE B — VIGIA DE SILÊNCIO 48H (Correção 6):
//   Cron a cada 15 min: cliente com última mensagem = cliente (respondeu) e
//   nenhuma resposta da Bia/equipe há 48h => system_log de alerta
//   (type='bia_silence_48h_alert', nível visível no /logs e no painel).
//   Nunca altera dados do cliente; só alerta. Idempotente por janela de 24h
//   (não repete o alerta do mesmo cliente antes disso).
// =============================================================================

// --- PARTE A: intercepção centralizada de disparo proativo -------------------
onRecordAfterCreateSuccess((e) => {
  try {
    const logType = e.record.getString('type') || ''
    const proactiveTypes = ['whatsapp_ai_send', 'instagram_send_result', 'messenger_ai_send']
    if (proactiveTypes.indexOf(logType) === -1) return e.next()

    // Mensagens de RESPOSTA da Bia a cliente que falou: nunca bloquear.
    let payloadObj = {}
    try {
      payloadObj = JSON.parse(e.record.getString('payload') || '{}')
    } catch (_) {}
    if (payloadObj.is_reply_to_customer_message === true) {
      console.log(
        `[REGUA_PAUSE] Envio permitido (resposta a cliente que escreveu): type=${logType} customer=${payloadObj.customer_id || 'n/a'}`,
      )
      return e.next()
    }

    // Consulta o controle global da régua
    let reguaActive = false
    try {
      const controls = $app.findRecordsByFilter(
        'app_controls',
        "key = 'regua_automations_active'",
        '',
        1,
        0,
      )
      if (controls.length > 0) {
        reguaActive = controls[0].getBool('is_active')
      }
    } catch (ctlErr) {
      console.warn(
        `[REGUA_PAUSE] app_controls indisponível (${String(ctlErr)}): assumindo régua PAUSADA (fail-closed).`,
      )
      reguaActive = false
    }

    if (!reguaActive) {
      // Cancela o envio proativo: remove a conversa recém-criada do histórico
      // (a régua grava a mensagem em 'conversations' antes do log de envio) e
      // registra a tentativa bloqueada.
      try {
        const convId = e.record.getString('conversation_id') || ''
        if (convId) {
          const conv = $app.findRecordById('conversations', convId)
          $app.delete(conv)
          console.log(`[REGUA_PAUSE] Conversa proativa ${convId} removida (régua pausada).`)
        }
      } catch (_) {}

      e.record.set('type', 'regua_dispatch_blocked')
      e.record.set(
        'message',
        `[REGUA_PAUSE] Disparo proativo BLOQUEADO (régua pausada): ${e.record.getString('message') || ''}`,
      )
      $app.saveNoValidate(e.record)
      console.log(
        `[REGUA_PAUSE] Disparo proativo bloqueado: type original=${logType} customer=${payloadObj.customer_id || 'n/a'}`,
      )
      return e.next()
    }

    console.log(`[REGUA_PAUSE] Régua ativa: envio proativo liberado (type=${logType}).`)
  } catch (blockErr) {
    console.error(`[REGUA_PAUSE] Erro inesperado no vigia de pausa: ${String(blockErr)}`)
  }
  return e.next()
}, 'system_logs')

// --- PARTE B: vigia de silêncio 48h ------------------------------------------
cronAdd('bia_silence_watch */15 * * * *', () => {
  const JOB = '[SILENCE_WATCH]'
  try {
    // Janela: 48h de silêncio após a última mensagem do cliente
    const windowStart = new Date(Date.now() - 48 * 3600 * 1000)
    const windowStartIso = windowStart.toISOString().replace('T', ' ').slice(0, 19)
    const alertWindowStart = new Date(Date.now() - 24 * 3600 * 1000)
      .toISOString()
      .replace('T', ' ')
      .slice(0, 19)

    // Última mensagem de cliente criada há entre 48h e 96h (não vasculha histórico infinito)
    const customerMsgs = $app.findRecordsByFilter(
      'conversations',
      "sender = 'customer' && created >= '" +
        new Date(Date.now() - 96 * 3600 * 1000).toISOString().replace('T', ' ').slice(0, 19) +
        "'",
      '-created',
      200,
      0,
    )

    // Última mensagem do cliente POR customer_id (a mais recente de cada)
    const lastCustomerMsg = {}
    for (let i = 0; i < customerMsgs.length; i++) {
      const cid = customerMsgs[i].getString('customer_id') || ''
      if (!cid || lastCustomerMsg[cid]) continue
      lastCustomerMsg[cid] = customerMsgs[i]
    }

    let checked = 0
    let alerted = 0
    let skippedAlerted = 0

    for (const cid in lastCustomerMsg) {
      checked++
      const custMsg = lastCustomerMsg[cid]
      const custMsgTime = new Date(custMsg.getString('created')).getTime()
      if (custMsgTime > windowStart.getTime()) continue // respondeu há menos de 48h
      if (custMsgTime < Date.now() - 96 * 3600 * 1000) continue

      // Já existe alerta recente (24h) para este cliente?
      let alreadyAlerted = false
      try {
        const prev = $app.findRecordsByFilter(
          'system_logs',
          "type = 'bia_silence_48h_alert' && payload ~ '" +
            cid +
            "' && created >= '" +
            alertWindowStartIso +
            "'",
          '',
          1,
          0,
        )
        alreadyAlerted = prev.length > 0
      } catch (_) {}
      if (alreadyAlerted) {
        skippedAlerted++
        continue
      }

      // Houve resposta da Bia/equipe APÓS a última mensagem do cliente?
      let biaRepliedAfter = false
      try {
        const biaMsgs = $app.findRecordsByFilter(
          'conversations',
          "customer_id = '" +
            cid +
            "' && (sender = 'ai' || sender = 'user' || sender = 'team') && created > '" +
            custMsg.getString('created') +
            "'",
          '-created',
          1,
          0,
        )
        biaRepliedAfter = biaMsgs.length > 0
      } catch (_) {}
      if (biaRepliedAfter) continue // Bia/equipe respondeu depois — sem alerta

      // Detalhes do cliente para a mensagem de alerta
      let custName = ''
      let custPhone = ''
      try {
        const cust = $app.findRecordById('customers', cid)
        custName = cust.getString('name') || ''
        custPhone = cust.getString('phone') || ''
      } catch (_) {}

      const hoursSilent = Math.floor((Date.now() - custMsgTime) / (1000 * 60 * 60))
      try {
        const logsCol = $app.findCollectionByNameOrId('system_logs')
        const alertLog = new Record(logsCol)
        alertLog.set('type', 'bia_silence_48h_alert')
        alertLog.set(
          'message',
          `[VIGIA 48H] Cliente ${custName || cid} (${custPhone}) está ${hoursSilent}h sem resposta da Bia/equipe desde a última mensagem dele.`,
        )
        alertLog.set(
          'details',
          `customer_id=${cid} | última mensagem do cliente: ${custMsg.getString('created')} | silêncio: ${hoursSilent}h | ação sugerida: contato manual do Mauro`,
        )
        alertLog.set(
          'payload',
          JSON.stringify({
            customer_id: cid,
            customer_name: custName,
            customer_phone: custPhone,
            silent_hours: hoursSilent,
            last_customer_message: custMsg.getString('created'),
          }),
        )
        $app.saveNoValidate(alertLog)
        alerted++
        console.log(`${JOB} ALERTA: cliente ${cid} (${custName}) ${hoursSilent}h sem resposta.`)
      } catch (_) {}
    }

    console.log(
      `${JOB} ciclo concluído: verificados=${checked} alertas_novos=${alerted} já_alertados(24h)=${skippedAlerted}`,
    )
  } catch (silenceErr) {
    console.error(`${JOB} Erro no vigia de silêncio: ${String(silenceErr)}`)
  }
})

console.log('[REGUA_PAUSE] hooks regua_global_pause.js carregados (pausa + vigia 48h)')
