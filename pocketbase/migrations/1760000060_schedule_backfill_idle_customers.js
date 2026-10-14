migrate(
  (app) => {
    // 1760000060_schedule_backfill_idle_customers.js
    // Backfill para agendamento de retomada D+1 em clientes antigos sem cronograma ativo.
    // Problema: Leads antigos em silêncio > 24h sem next_follow_up_at ficavam esquecidos para sempre.
    // Solução: Varre todos os clientes ativos (não bloqueados, sem tag ai_paused, não marcados frio)
    // cuja última interação tem mais de 24h e agenda a próxima retomada (D+1 respeitando a janela 8h-20h seg-sab).
    // Registra o total agendado no system_logs.

    console.log('[MIG_1760000060] Iniciando backfill de agendamentos para clientes esquecidos...')

    // Função para calcular próxima janela útil (08:00 - 20:00, seg a sab no fuso America/Sao_Paulo UTC-3)
    function calculateNextValidWindow(baseDateMs) {
      // Começamos calculando 24 horas à frente da base (ou agora se base já foi no passado)
      var targetMs = Math.max(Date.now() + 15 * 60 * 1000, baseDateMs + 24 * 3600 * 1000)
      var target = new Date(targetMs)

      // Ajuste iterativo para cair em horário comercial (8h às 20h) de segunda a sábado (UTC-3)
      // Fazemos no máximo 14 iterações de dia/hora
      for (var iter = 0; iter < 14; iter++) {
        var spIso = target.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
        var spDate = new Date(spIso)
        var spDay = spDate.getDay() // 0 = Domingo, 6 = Sábado
        var spHour = spDate.getHours()

        // Se for Domingo (0), avança para Segunda 09:00 SP
        if (spDay === 0) {
          target = new Date(target.getTime() + 24 * 3600 * 1000)
          target.setUTCHours(12, 0, 0, 0) // 12 UTC = 09:00 SP
          continue
        }

        // Se antes das 8h SP (spHour < 8), ajusta para 09:00 SP do mesmo dia
        if (spHour < 8) {
          var diffH = 9 - spHour
          target = new Date(target.getTime() + diffH * 3600 * 1000)
          continue
        }

        // Se a partir das 20h SP (spHour >= 20), pula para o dia seguinte às 09:00 SP
        if (spHour >= 20) {
          target = new Date(target.getTime() + (24 - spHour + 9) * 3600 * 1000)
          continue
        }

        // Horário válido alcançado!
        break
      }

      return target.toISOString()
    }

    var nowMs = Date.now()
    var cutoff24hMs = nowMs - 24 * 3600 * 1000
    var scheduledCount = 0
    var totalEvaluated = 0
    var scheduledCustomerIds = []

    // Busca clientes ativos com follow-up pendente ou vazio
    // Usamos paginação em blocos de 100 para cobrir com segurança toda a base
    var batchSize = 100
    var page = 0
    var hasMore = true

    while (hasMore) {
      var customers = []
      try {
        customers = app.findRecordsByFilter(
          'customers',
          "is_blocked = false && (persistence_status = 'ativo' || persistence_status = '' || persistence_status = null) && (next_follow_up_at = '' || next_follow_up_at = null)",
          '-updated',
          batchSize,
          page * batchSize,
        )
      } catch (eFind) {
        console.warn('[MIG_1760000060] Erro ao buscar lote de customers: ' + String(eFind))
        break
      }

      if (!customers || customers.length === 0) {
        hasMore = false
        break
      }

      for (var i = 0; i < customers.length; i++) {
        var cust = customers[i]
        totalEvaluated++

        var tagsRaw = cust.get('tags') || []
        var tagsStr = JSON.stringify(tagsRaw).toLowerCase()

        // Guardas essenciais:
        // 1. Não pode ter ai_paused
        if (tagsStr.includes('ai_paused')) continue

        // 2. Não pode estar marcado como frio ou recusa ("não é o momento")
        if (tagsStr.includes('frio') || tagsStr.includes('não é o momento')) continue

        // 3. Não pode estar com follow_up_step 'finalizado'
        var currentStep = cust.getString('follow_up_step') || ''
        if (currentStep === 'finalizado') continue

        // 4. Checar a última interação:
        // Prioriza a data de conversations; se não houver conversas, usa last_sent_at, updated ou created
        var lastInteractionMs = 0

        try {
          var convs = app.findRecordsByFilter(
            'conversations',
            "customer_id = '" + cust.id + "'",
            '-created',
            1,
            0,
          )
          if (convs && convs.length > 0) {
            var cDateStr = convs[0].getString('created') || convs[0].get('created')
            if (cDateStr) lastInteractionMs = new Date(cDateStr).getTime()
          }
        } catch (_) {}

        if (!lastInteractionMs) {
          var lastSentStr = cust.getString('last_sent_at')
          if (lastSentStr) {
            lastInteractionMs = new Date(lastSentStr).getTime()
          }
        }

        if (!lastInteractionMs) {
          var updatedStr = cust.getString('updated') || cust.get('updated')
          if (updatedStr) {
            lastInteractionMs = new Date(updatedStr).getTime()
          }
        }

        if (!lastInteractionMs) {
          var createdStr = cust.getString('created') || cust.get('created')
          if (createdStr) {
            lastInteractionMs = new Date(createdStr).getTime()
          }
        }

        // Se a última interação foi a menos de 24h, o cliente ainda não completou a janela de silêncio
        if (lastInteractionMs && lastInteractionMs > cutoff24hMs) {
          continue
        }

        // O cliente está em silêncio > 24h e sem agendamento!
        // Define o primeiro degrau (D+1) ou preserva o step atual se já for d1/d3/d7/d14
        var nextStepToSchedule = currentStep || 'd1'
        var scheduledAtIso = calculateNextValidWindow(lastInteractionMs || cutoff24hMs)

        cust.set('persistence_status', 'ativo')
        cust.set('follow_up_step', nextStepToSchedule)
        cust.set('next_follow_up_at', scheduledAtIso)

        try {
          app.saveNoValidate(cust)
          scheduledCount++
          if (scheduledCustomerIds.length < 50) {
            scheduledCustomerIds.push(cust.id + ' (' + (cust.getString('name') || 'Sem nome') + ')')
          }
        } catch (saveErr) {
          console.warn(
            '[MIG_1760000060] Falha ao salvar customer ' + cust.id + ': ' + String(saveErr),
          )
        }
      }

      if (customers.length < batchSize) {
        hasMore = false
      } else {
        page++
      }
    }

    console.log(
      '[MIG_1760000060] Backfill concluído: ' +
        scheduledCount +
        ' clientes agendados de ' +
        totalEvaluated +
        ' avaliados.',
    )

    // Registrar no system_logs o resultado completo da operação
    try {
      var logsCol = app.findCollectionByNameOrId('system_logs')
      var sysLog = new Record(logsCol)
      sysLog.set('type', 'persistence_backfill_executed')
      sysLog.set(
        'message',
        'Backfill de retomada concluído: ' +
          scheduledCount +
          ' clientes antigos em silêncio > 24h receberam agendamento D+1 na janela válida.',
      )
      sysLog.set(
        'details',
        JSON.stringify({
          scheduled_count: scheduledCount,
          total_evaluated: totalEvaluated,
          sample_scheduled_customers: scheduledCustomerIds,
          executed_at: new Date().toISOString(),
        }),
      )
      app.saveNoValidate(sysLog)
      console.log('[MIG_1760000060] Log de auditoria registrado em system_logs com sucesso.')
    } catch (logErr) {
      console.warn('[MIG_1760000060] Falha ao registrar log de auditoria: ' + String(logErr))
    }
  },
  (app) => {
    // Reversão opcional (não destrutiva)
    console.log('[MIG_1760000060] Rollback executado.')
  },
)
