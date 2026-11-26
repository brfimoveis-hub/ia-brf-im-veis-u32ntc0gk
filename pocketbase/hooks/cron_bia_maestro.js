/// <reference path="../pb_data/types.d.ts" />
// MAESTRO — CICLO DE VALOR DA BIA (cron diário 03:00 + rota manual + rota de leitura)
// Ciclo: lê o trabalho real (conversas, clientes, imóveis, base de conhecimento),
// pede à IA ($ai.chat) learnings estruturados e grava em bia_maestro_insights.
// NUNCA mexe no atendimento: toda falha é registrada e engolida (não-fatal).
// REGRA JSVM (não negociável): callbacks 100% inline — nada de referências externas.
// Por isso o ciclo é DUPLICADO no callback do cron e no da rota manual (padrão do projeto).

// JSVM: cada callback abaixo contém TODAS as suas funções auxiliares inline (duplicadas de propósito).

// ============================ CICLO DIÁRIO (03:00) ============================
cronAdd('bia_maestro_daily', '0 3 * * *', function () {
  function pad2Maestro(n) {
    return (n < 10 ? '0' : '') + n
  }
  function maestroDateOffset(days) {
    var d = new Date(Date.now() + days * 86400000)
    return d.toISOString().replace('T', ' ').substring(0, 19)
  }
  function maestroSafeJsonTags(rec) {
    try {
      var raw = rec.getString('tags') || '[]'
      var arr = JSON.parse(raw)
      if (!Array.isArray(arr)) return '[]'
      return raw.substring(0, 200)
    } catch (_) {
      return '[]'
    }
  }
  function maestroLogError(appRef, cicloRef, msg) {
    try {
      var colE = appRef.findCollectionByNameOrId('bia_maestro_insights')
      var recE = new Record(colE)
      recE.set('ciclo', cicloRef)
      recE.set('status', 'error')
      recE.set('resumo', 'Ciclo com erro — não afetou o atendimento.')
      recE.set('learnings', '[]')
      recE.set('metrics', '{}')
      recE.set('error', String(msg || 'erro desconhecido').substring(0, 500))
      appRef.saveNoValidate(recE)
    } catch (logErr) {
      console.warn(
        '[MAESTRO] Falha ao gravar erro: ' + (logErr && logErr.message ? logErr.message : logErr),
      )
    }
    console.warn('[MAESTRO] ' + msg)
  }
  function maestroParseAiJson(raw) {
    var s = String(raw || '').trim()
    var m = s.match(/\{[\s\S]*\}/)
    if (m) s = m[0]
    try {
      return JSON.parse(s)
    } catch (_) {
      return {}
    }
  }
  function maestroSanitizeLearnings(arr) {
    var out = []
    for (var i = 0; i < arr.length && i < 12; i++) {
      var l = arr[i] || {}
      var tipo = String(l.tipo || 'demanda_nao_resolvida')
      var texto = String(l.texto || '')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 400)
      if (!texto) continue
      out.push({ tipo: tipo, texto: texto })
    }
    return out
  }
  var trigger = 'cron'
  var outcome = { ok: false, ciclo: '', insightId: '', status: '', error: '', trigger: trigger }
  var app = $app
  try {
    var brNow = new Date(Date.now() - 3 * 3600000)
    var ciclo =
      brNow.getUTCFullYear() +
      '-' +
      pad2Maestro(brNow.getUTCMonth() + 1) +
      '-' +
      pad2Maestro(brNow.getUTCDate())
    outcome.ciclo = ciclo

    // 1. IDEMPOTÊNCIA: um ciclo por dia
    var existing = null
    try {
      existing = app.findFirstRecordByFilter('bia_maestro_insights', "ciclo = '" + ciclo + "'")
    } catch (_) {}
    if (existing) {
      outcome.ok = true
      outcome.insightId = existing.id
      outcome.status = 'already_ran_today'
      console.log(
        '[MAESTRO] Ciclo ' + ciclo + ' já rodou hoje (id ' + existing.id + '). Ignorando.',
      )
      return
    }

    // 2. MÉTRICAS DO DIA
    var sinceIso = ciclo + ' 03:00:00.000Z'
    var metrics = {
      mensagens_clientes: 0,
      respostas_bia: 0,
      sem_resposta: 0,
      clientes_ativos: 0,
      imoveis_ativos: 0,
      arquivos_conhecimento: 0,
    }
    var inboundMsgs = []
    var aiMsgs = []

    try {
      metrics.mensagens_clientes = app.countRecords(
        'conversations',
        "created >= '" + sinceIso + "' && (sender = 'customer' || sender = 'user')",
      )
      metrics.respostas_bia = app.countRecords(
        'conversations',
        "created >= '" + sinceIso + "' && sender = 'ai'",
      )
    } catch (mErr) {
      console.warn('[MAESTRO] Falha métricas conversas: ' + mErr.message)
    }

    try {
      inboundMsgs = app.findRecordsByFilter(
        'conversations',
        "created >= '" + sinceIso + "' && (sender = 'customer' || sender = 'user')",
        '-created',
        120,
        0,
      )
      aiMsgs = app.findRecordsByFilter(
        'conversations',
        "created >= '" + sinceIso + "' && sender = 'ai'",
        '-created',
        120,
        0,
      )
    } catch (_) {}

    // Sem resposta: cliente cuja última msg é dele e está pendente há mais de 2h
    try {
      var recentCust = app.findRecordsByFilter(
        'customers',
        "updated >= '" + sinceIso + "'",
        '-updated',
        300,
        0,
      )
      for (var c = 0; c < recentCust.length; c++) {
        var cid = recentCust[c].id
        try {
          var lastUser = app.findFirstRecordByFilter(
            'conversations',
            "customer_id = '" + cid + "' && (sender = 'customer' || sender = 'user')",
            '-created',
          )
          if (!lastUser) continue
          var lastAi = app.findFirstRecordByFilter(
            'conversations',
            "customer_id = '" + cid + "' && sender = 'ai'",
            '-created',
          )
          var msUser = new Date(lastUser.getString('created')).getTime()
          var msAi = lastAi ? new Date(lastAi.getString('created')).getTime() : 0
          if (msUser - msAi > 2 * 3600 * 1000) metrics.sem_resposta++
        } catch (_) {}
      }
    } catch (sErr) {
      console.warn('[MAESTRO] Falha métrica sem_resposta: ' + sErr.message)
    }

    try {
      metrics.clientes_ativos = app.countRecords('customers', 'is_blocked = false') || 0
      metrics.imoveis_ativos = app.countRecords('properties', 'is_active = true') || 0
      metrics.arquivos_conhecimento =
        app.countRecords('ai_knowledge_files', 'is_active = true') || 0
    } catch (_) {}

    // 3. RESUMO DO TRABALHO PARA A IA
    var workSummary = []
    workSummary.push('=== TRABALHO REAL DA BIA (BRF Imóveis) — desde ' + sinceIso + ' ===')
    workSummary.push(
      'Métricas: mensagens de clientes=' +
        metrics.mensagens_clientes +
        ', respostas da Bia=' +
        metrics.respostas_bia +
        ', atendimentos sem resposta há mais de 2h=' +
        metrics.sem_resposta +
        ', clientes ativos=' +
        metrics.clientes_ativos +
        ', imóveis ativos=' +
        metrics.imoveis_ativos +
        ', arquivos na base de conhecimento=' +
        metrics.arquivos_conhecimento,
    )

    workSummary.push('\n=== ÚLTIMAS MENSAGENS DE CLIENTES (' + inboundMsgs.length + ') ===')
    for (var u = 0; u < inboundMsgs.length; u++) {
      var umTxt = (inboundMsgs[u].getString('content') || '').replace(/\s+/g, ' ').trim()
      if (!umTxt) continue
      workSummary.push('- [' + inboundMsgs[u].getString('created') + '] ' + umTxt.substring(0, 180))
    }

    workSummary.push('\n=== AMOSTRA DAS RESPOSTAS DA BIA (' + aiMsgs.length + ') ===')
    for (var a = 0; a < aiMsgs.length; a++) {
      var amTxt = (aiMsgs[a].getString('content') || '').replace(/\s+/g, ' ').trim()
      if (!amTxt) continue
      workSummary.push('- [' + aiMsgs[a].getString('created') + '] ' + amTxt.substring(0, 180))
    }

    workSummary.push('\n=== CLIENTES RECENTES (últimos 7 dias, amostra 40) ===')
    try {
      var recentCustomers = app.findRecordsByFilter(
        'customers',
        "created >= '" + maestroDateOffset(-7) + "'",
        '-created',
        40,
        0,
      )
      for (var rc = 0; rc < recentCustomers.length; rc++) {
        var rcC = recentCustomers[rc]
        workSummary.push(
          '- ' +
            (rcC.getString('name') || '(sem nome)') +
            ' | status=' +
            (rcC.getString('status') || '?') +
            ' | origem=' +
            (rcC.getString('source') || '?') +
            ' | promessa_pendente=' +
            (rcC.getBool('promise_pending') ? 'sim' : 'não') +
            ' | tags=' +
            maestroSafeJsonTags(rcC),
        )
      }
    } catch (_) {}

    workSummary.push('\n=== PORTFÓLIO ATIVO (amostra 30) ===')
    try {
      var props = app.findRecordsByFilter('properties', 'is_active = true', '-updated', 30, 0)
      for (var p = 0; p < props.length; p++) {
        workSummary.push(
          '- ' +
            (props[p].getString('title') || props[p].getString('code') || props[p].id) +
            ' | bairro=' +
            (props[p].getString('neighborhood') || '?') +
            ' | cidade=' +
            (props[p].getString('city') || '?') +
            ' | valor=' +
            (props[p].getString('price_formatted') || props[p].getFloat('price') || '?'),
        )
      }
    } catch (_) {}

    workSummary.push('\n=== BASE DE CONHECIMENTO (amostra 30) ===')
    var kf = []
    try {
      kf = app.findRecordsByFilter('ai_knowledge_files', 'is_active = true', '-updated', 30, 0)
    } catch (_) {}
    for (var k = 0; k < kf.length; k++) {
      workSummary.push(
        '- ' +
          (kf[k].getString('name') || kf[k].id) +
          ' | imóvel=' +
          (kf[k].getString('property_id') || 'geral') +
          ' | tipo=' +
          (kf[k].getString('mime_type') || '?'),
      )
    }

    var workSummaryText = workSummary.join('\n')
    if (workSummaryText.length > 14000) {
      workSummaryText = workSummaryText.substring(0, 14000) + '\n... [resumo truncado]'
    }

    // 4. CHAMADA À IA — learnings estruturados
    var prompt = [
      'Você é o MAESTRO, mentor da Bia, atendente de IA da imobiliária BRF Imóveis (São José / Grande Florianópolis, SC — apartamentos na planta e litoral de SC).',
      'Analise o trabalho real do dia abaixo (conversas WhatsApp/Instagram, clientes, portfólio e base de conhecimento) e gere APRENDIZADOS para a Bia evoluir.',
      '',
      workSummaryText,
      '',
      'Responda APENAS com JSON válido, no formato:',
      '{',
      '  "resumo": "resumo em 2-3 frases, em português, do que aconteceu no trabalho hoje",',
      '  "learnings": [',
      '    { "tipo": "demanda_nao_resolvida|pergunta_repetida|erro_repetido|oportunidade|objecao", "texto": "aprendizado curto e claro (1-2 frases), em português" }',
      '  ]',
      '}',
      'Gere de 3 a 7 learnings. Tipos:',
      '- demanda_nao_resolvida: pedido de cliente que ficou sem resposta;',
      '- pergunta_repetida: pergunta que clientes fizeram e a Bia não soube responder bem;',
      '- erro_repetido: promessa ou erro que se repetiu nas respostas;',
      '- oportunidade: cliente quente, imóvel pedido vs. portfólio, chance de visita;',
      '- objecao: padrão de objeção recorrente e como contornar.',
      'Se não houver dados suficientes, devolva resumo honesto ("Sem trabalho registrado no período") e learnings vazio.',
    ].join('\n')

    var rawAi = ''
    try {
      var aiRes = $ai.chat({ model: 'fast', messages: [{ role: 'user', content: prompt }] })
      if (aiRes && aiRes.choices && aiRes.choices[0] && aiRes.choices[0].message) {
        rawAi = String(aiRes.choices[0].message.content || '').trim()
      }
    } catch (aiErr) {
      maestroLogError(app, ciclo, 'IA falhou: ' + aiErr.message)
      outcome.ok = true
      outcome.status = 'error_logged'
      outcome.error = 'IA: ' + aiErr.message
      return
    }

    if (!rawAi) {
      maestroLogError(app, ciclo, 'IA respondeu vazio')
      outcome.ok = true
      outcome.status = 'error_logged'
      outcome.error = 'IA vazio'
      return
    }

    // 5. PARSE ROBUSTO DO JSON
    var parsed = maestroParseAiJson(rawAi)
    var resumo = String(parsed.resumo || '').trim()
    var learnings = Array.isArray(parsed.learnings) ? parsed.learnings : []
    if (!resumo && learnings.length === 0) {
      maestroLogError(app, ciclo, 'IA não devolveu JSON válido: ' + rawAi.substring(0, 200))
      outcome.ok = true
      outcome.status = 'error_logged'
      outcome.error = 'JSON inválido da IA'
      return
    }

    // 6. PERSISTE O CICLO
    try {
      var col = app.findCollectionByNameOrId('bia_maestro_insights')
      var rec = new Record(col)
      rec.set('ciclo', ciclo)
      rec.set('status', 'ok')
      rec.set('resumo', resumo || 'Ciclo sem resumo')
      rec.set('learnings', JSON.stringify(maestroSanitizeLearnings(learnings)))
      rec.set('metrics', JSON.stringify(metrics))
      rec.set('error', '')
      app.saveNoValidate(rec)
      outcome.ok = true
      outcome.insightId = rec.id
      outcome.status = 'ok'
      console.log(
        '[MAESTRO] Ciclo ' +
          ciclo +
          ' gravado (id ' +
          rec.id +
          ', ' +
          learnings.length +
          ' learnings).',
      )
    } catch (pErr) {
      maestroLogError(app, ciclo, 'Falha ao gravar bia_maestro_insights: ' + pErr.message)
      outcome.ok = false
      outcome.status = 'error_logged'
      outcome.error = 'Persist: ' + pErr.message
    }
  } catch (cycleErr) {
    maestroLogError(
      app,
      outcome.ciclo || '',
      'Erro inesperado no ciclo: ' + (cycleErr.message || String(cycleErr)),
    )
    outcome.ok = false
    outcome.status = 'error_logged'
    outcome.error = String(cycleErr.message || cycleErr)
  }
})

// ============================ ROTA MANUAL (painel) ============================
routerAdd(
  'POST',
  '/backend/v1/maestro_run',
  function (e) {
    function pad2Maestro(n) {
      return (n < 10 ? '0' : '') + n
    }
    function maestroDateOffset(days) {
      var d = new Date(Date.now() + days * 86400000)
      return d.toISOString().replace('T', ' ').substring(0, 19)
    }
    function maestroSafeJsonTags(rec) {
      try {
        var raw = rec.getString('tags') || '[]'
        var arr = JSON.parse(raw)
        if (!Array.isArray(arr)) return '[]'
        return raw.substring(0, 200)
      } catch (_) {
        return '[]'
      }
    }
    function maestroLogError(appRef, cicloRef, msg) {
      try {
        var colE = appRef.findCollectionByNameOrId('bia_maestro_insights')
        var recE = new Record(colE)
        recE.set('ciclo', cicloRef)
        recE.set('status', 'error')
        recE.set('resumo', 'Ciclo com erro — não afetou o atendimento.')
        recE.set('learnings', '[]')
        recE.set('metrics', '{}')
        recE.set('error', String(msg || 'erro desconhecido').substring(0, 500))
        appRef.saveNoValidate(recE)
      } catch (logErr) {
        console.warn(
          '[MAESTRO] Falha ao gravar erro: ' + (logErr && logErr.message ? logErr.message : logErr),
        )
      }
      console.warn('[MAESTRO] ' + msg)
    }
    function maestroParseAiJson(raw) {
      var s = String(raw || '').trim()
      var m = s.match(/\{[\s\S]*\}/)
      if (m) s = m[0]
      try {
        return JSON.parse(s)
      } catch (_) {
        return {}
      }
    }
    function maestroSanitizeLearnings(arr) {
      var out = []
      for (var i = 0; i < arr.length && i < 12; i++) {
        var l = arr[i] || {}
        var tipo = String(l.tipo || 'demanda_nao_resolvida')
        var texto = String(l.texto || '')
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 400)
        if (!texto) continue
        out.push({ tipo: tipo, texto: texto })
      }
      return out
    }
    var trigger = 'manual'
    var outcome = { ok: false, ciclo: '', insightId: '', status: '', error: '', trigger: trigger }
    var app = $app
    try {
      var brNow = new Date(Date.now() - 3 * 3600000)
      var ciclo =
        brNow.getUTCFullYear() +
        '-' +
        pad2Maestro(brNow.getUTCMonth() + 1) +
        '-' +
        pad2Maestro(brNow.getUTCDate())
      outcome.ciclo = ciclo

      var existing = null
      try {
        existing = app.findFirstRecordByFilter('bia_maestro_insights', "ciclo = '" + ciclo + "'")
      } catch (_) {}
      if (existing) {
        outcome.ok = true
        outcome.insightId = existing.id
        outcome.status = 'already_ran_today'
        return e.json(200, { success: true, outcome: outcome })
      }

      var sinceIso = ciclo + ' 03:00:00.000Z'
      var metrics = {
        mensagens_clientes: 0,
        respostas_bia: 0,
        sem_resposta: 0,
        clientes_ativos: 0,
        imoveis_ativos: 0,
        arquivos_conhecimento: 0,
      }
      var inboundMsgs = []
      var aiMsgs = []

      try {
        metrics.mensagens_clientes = app.countRecords(
          'conversations',
          "created >= '" + sinceIso + "' && (sender = 'customer' || sender = 'user')",
        )
        metrics.respostas_bia = app.countRecords(
          'conversations',
          "created >= '" + sinceIso + "' && sender = 'ai'",
        )
      } catch (mErr2) {
        console.warn('[MAESTRO] Falha métricas conversas: ' + mErr2.message)
      }

      try {
        inboundMsgs = app.findRecordsByFilter(
          'conversations',
          "created >= '" + sinceIso + "' && (sender = 'customer' || sender = 'user')",
          '-created',
          120,
          0,
        )
        aiMsgs = app.findRecordsByFilter(
          'conversations',
          "created >= '" + sinceIso + "' && sender = 'ai'",
          '-created',
          120,
          0,
        )
      } catch (_) {}

      try {
        var recentCust2 = app.findRecordsByFilter(
          'customers',
          "updated >= '" + sinceIso + "'",
          '-updated',
          300,
          0,
        )
        for (var c2 = 0; c2 < recentCust2.length; c2++) {
          var cid2 = recentCust2[c2].id
          try {
            var lastUser2 = app.findFirstRecordByFilter(
              'conversations',
              "customer_id = '" + cid2 + "' && (sender = 'customer' || sender = 'user')",
              '-created',
            )
            if (!lastUser2) continue
            var lastAi2 = app.findFirstRecordByFilter(
              'conversations',
              "customer_id = '" + cid2 + "' && sender = 'ai'",
              '-created',
            )
            var msUser2 = new Date(lastUser2.getString('created')).getTime()
            var msAi2 = lastAi2 ? new Date(lastAi2.getString('created')).getTime() : 0
            if (msUser2 - msAi2 > 2 * 3600 * 1000) metrics.sem_resposta++
          } catch (_) {}
        }
      } catch (_) {}

      try {
        metrics.clientes_ativos = app.countRecords('customers', 'is_blocked = false') || 0
        metrics.imoveis_ativos = app.countRecords('properties', 'is_active = true') || 0
        metrics.arquivos_conhecimento =
          app.countRecords('ai_knowledge_files', 'is_active = true') || 0
      } catch (_) {}

      var workSummary2 = []
      workSummary2.push('=== TRABALHO REAL DA BIA (BRF Imóveis) — desde ' + sinceIso + ' ===')
      workSummary2.push(
        'Métricas: mensagens de clientes=' +
          metrics.mensagens_clientes +
          ', respostas da Bia=' +
          metrics.respostas_bia +
          ', atendimentos sem resposta há mais de 2h=' +
          metrics.sem_resposta +
          ', clientes ativos=' +
          metrics.clientes_ativos +
          ', imóveis ativos=' +
          metrics.imoveis_ativos +
          ', arquivos na base de conhecimento=' +
          metrics.arquivos_conhecimento,
      )

      workSummary2.push('\n=== ÚLTIMAS MENSAGENS DE CLIENTES (' + inboundMsgs.length + ') ===')
      for (var u2 = 0; u2 < inboundMsgs.length; u2++) {
        var umTxt2 = (inboundMsgs[u2].getString('content') || '').replace(/\s+/g, ' ').trim()
        if (!umTxt2) continue
        workSummary2.push(
          '- [' + inboundMsgs[u2].getString('created') + '] ' + umTxt2.substring(0, 180),
        )
      }

      workSummary2.push('\n=== AMOSTRA DAS RESPOSTAS DA BIA (' + aiMsgs.length + ') ===')
      for (var a2 = 0; a2 < aiMsgs.length; a2++) {
        var amTxt2 = (aiMsgs[a2].getString('content') || '').replace(/\s+/g, ' ').trim()
        if (!amTxt2) continue
        workSummary2.push('- [' + aiMsgs[a2].getString('created') + '] ' + amTxt2.substring(0, 180))
      }

      workSummary2.push('\n=== CLIENTES RECENTES (últimos 7 dias, amostra 40) ===')
      try {
        var recentCustomers2 = app.findRecordsByFilter(
          'customers',
          "created >= '" + maestroDateOffset(-7) + "'",
          '-created',
          40,
          0,
        )
        for (var rc2 = 0; rc2 < recentCustomers2.length; rc2++) {
          var rcC2 = recentCustomers2[rc2]
          workSummary2.push(
            '- ' +
              (rcC2.getString('name') || '(sem nome)') +
              ' | status=' +
              (rcC2.getString('status') || '?') +
              ' | origem=' +
              (rcC2.getString('source') || '?') +
              ' | promessa_pendente=' +
              (rcC2.getBool('promise_pending') ? 'sim' : 'não') +
              ' | tags=' +
              maestroSafeJsonTags(rcC2),
          )
        }
      } catch (_) {}

      workSummary2.push('\n=== PORTFÓLIO ATIVO (amostra 30) ===')
      try {
        var props2 = app.findRecordsByFilter('properties', 'is_active = true', '-updated', 30, 0)
        for (var p2 = 0; p2 < props2.length; p2++) {
          workSummary2.push(
            '- ' +
              (props2[p2].getString('title') || props2[p2].getString('code') || props2[p2].id) +
              ' | bairro=' +
              (props2[p2].getString('neighborhood') || '?') +
              ' | cidade=' +
              (props2[p2].getString('city') || '?') +
              ' | valor=' +
              (props2[p2].getString('price_formatted') || props2[p2].getFloat('price') || '?'),
          )
        }
      } catch (_) {}

      workSummary2.push('\n=== BASE DE CONHECIMENTO (amostra 30) ===')
      var kf2 = []
      try {
        kf2 = app.findRecordsByFilter('ai_knowledge_files', 'is_active = true', '-updated', 30, 0)
      } catch (_) {}
      for (var k2 = 0; k2 < kf2.length; k2++) {
        workSummary2.push(
          '- ' +
            (kf2[k2].getString('name') || kf2[k2].id) +
            ' | imóvel=' +
            (kf2[k2].getString('property_id') || 'geral') +
            ' | tipo=' +
            (kf2[k2].getString('mime_type') || '?'),
        )
      }

      var workSummaryText2 = workSummary2.join('\n')
      if (workSummaryText2.length > 14000) {
        workSummaryText2 = workSummaryText2.substring(0, 14000) + '\n... [resumo truncado]'
      }

      var prompt2 = [
        'Você é o MAESTRO, mentor da Bia, atendente de IA da imobiliária BRF Imóveis (São José / Grande Florianópolis, SC — apartamentos na planta e litoral de SC).',
        'Analise o trabalho real do dia abaixo (conversas WhatsApp/Instagram, clientes, portfólio e base de conhecimento) e gere APRENDIZADOS para a Bia evoluir.',
        '',
        workSummaryText2,
        '',
        'Responda APENAS com JSON válido, no formato:',
        '{',
        '  "resumo": "resumo em 2-3 frases, em português, do que aconteceu no trabalho hoje",',
        '  "learnings": [',
        '    { "tipo": "demanda_nao_resolvida|pergunta_repetida|erro_repetido|oportunidade|objecao", "texto": "aprendizado curto e claro (1-2 frases), em português" }',
        '  ]',
        '}',
        'Gere de 3 a 7 learnings. Tipos:',
        '- demanda_nao_resolvida: pedido de cliente que ficou sem resposta;',
        '- pergunta_repetida: pergunta que clientes fizeram e a Bia não soube responder bem;',
        '- erro_repetido: promessa ou erro que se repetiu nas respostas;',
        '- oportunidade: cliente quente, imóvel pedido vs. portfólio, chance de visita;',
        '- objecao: padrão de objeção recorrente e como contornar.',
        'Se não houver dados suficientes, devolva resumo honesto ("Sem trabalho registrado no período") e learnings vazio.',
      ].join('\n')

      var rawAi2 = ''
      try {
        var aiRes2 = $ai.chat({ model: 'fast', messages: [{ role: 'user', content: prompt2 }] })
        if (aiRes2 && aiRes2.choices && aiRes2.choices[0] && aiRes2.choices[0].message) {
          rawAi2 = String(aiRes2.choices[0].message.content || '').trim()
        }
      } catch (aiErr2) {
        maestroLogError(app, ciclo, 'IA falhou: ' + aiErr2.message)
        outcome.ok = true
        outcome.status = 'error_logged'
        outcome.error = 'IA: ' + aiErr2.message
        return e.json(200, { success: true, outcome: outcome })
      }

      if (!rawAi2) {
        maestroLogError(app, ciclo, 'IA respondeu vazio')
        outcome.ok = true
        outcome.status = 'error_logged'
        outcome.error = 'IA vazio'
        return e.json(200, { success: true, outcome: outcome })
      }

      var parsed2 = maestroParseAiJson(rawAi2)
      var resumo2 = String(parsed2.resumo || '').trim()
      var learnings2 = Array.isArray(parsed2.learnings) ? parsed2.learnings : []
      if (!resumo2 && learnings2.length === 0) {
        maestroLogError(app, ciclo, 'IA não devolveu JSON válido: ' + rawAi2.substring(0, 200))
        outcome.ok = true
        outcome.status = 'error_logged'
        outcome.error = 'JSON inválido da IA'
        return e.json(200, { success: true, outcome: outcome })
      }

      try {
        var col2 = app.findCollectionByNameOrId('bia_maestro_insights')
        var rec2 = new Record(col2)
        rec2.set('ciclo', ciclo)
        rec2.set('status', 'ok')
        rec2.set('resumo', resumo2 || 'Ciclo sem resumo')
        rec2.set('learnings', JSON.stringify(maestroSanitizeLearnings(learnings2)))
        rec2.set('metrics', JSON.stringify(metrics))
        rec2.set('error', '')
        app.saveNoValidate(rec2)
        outcome.ok = true
        outcome.insightId = rec2.id
        outcome.status = 'ok'
        console.log(
          '[MAESTRO] Ciclo manual ' +
            ciclo +
            ' gravado (id ' +
            rec2.id +
            ', ' +
            learnings2.length +
            ' learnings).',
        )
      } catch (pErr2) {
        maestroLogError(app, ciclo, 'Falha ao gravar bia_maestro_insights: ' + pErr2.message)
        outcome.ok = false
        outcome.status = 'error_logged'
        outcome.error = 'Persist: ' + pErr2.message
      }

      return e.json(200, { success: true, outcome: outcome })
    } catch (err) {
      return e.json(500, { success: false, error: String(err) })
    }
  },
  $apis.requireAuth(),
)

// ============================ ROTA DE LEITURA (painel) ============================
routerAdd(
  'GET',
  '/backend/v1/maestro_insights',
  function (e) {
    try {
      var rows = $app.findRecordsByFilter('bia_maestro_insights', '', '-created', 15, 0)
      var out = []
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        var learningsArr = []
        var metricsObj = {}
        try {
          learningsArr = JSON.parse(r.getString('learnings') || '[]')
        } catch (_) {}
        try {
          metricsObj = JSON.parse(r.getString('metrics') || '{}')
        } catch (_) {}
        out.push({
          id: r.id,
          ciclo: r.getString('ciclo'),
          status: r.getString('status'),
          resumo: r.getString('resumo'),
          learnings: learningsArr,
          metrics: metricsObj,
          error: r.getString('error'),
          created: r.getString('created'),
        })
      }
      return e.json(200, { insights: out })
    } catch (err) {
      return e.json(500, { insights: [], error: String(err) })
    }
  },
  $apis.requireAuth(),
)
