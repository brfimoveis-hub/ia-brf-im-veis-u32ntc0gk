/// <reference path="../pb_data/types.d.ts" />
// MAESTRO — CICLO DE VALOR DA BIA (cron diário 03:00 + rota manual + rota de leitura)
// Ciclo: lê o trabalho real (conversas, clientes, imóveis, base de conhecimento),
// pede à IA ($ai.chat) learnings estruturados e grava em bia_maestro_insights.
// FASE CRM (nova): enriquece perfis de clientes (maestro_temperature, maestro_interest,
// maestro_needs_human, maestro_updated_at) com base nas conversas reais — 100% inline,
// sem IA, nunca toca no atendimento (nenhum envio, nenhum hook de atendimento).
// REGRA JSVM (não negociável): callbacks 100% inline — nada de referências externas.
// Por isso o ciclo é DUPLICADO no callback do cron e no da rota manual (padrão do projeto).

// JSVM: cada callback abaixo contém TODAS as suas funções auxiliares inline (duplicadas de propósito).

// ============================ CICLO DIÁRIO (03:00) ============================
cronAdd('bia_maestro_daily', '* * * * *', function () {
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
  // ---------- FASE CRM: helpers de enriquecimento (inline, sem IA) ----------
  function maestroNormTxt(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  }
  // Cliente está em campanha/régua ativa? (next_follow_up_at futuro OU follow_up_step em curso)
  function maestroEmCampanhaAtiva(appRef, custRec, nowMs) {
    try {
      var nfa = custRec.getString('next_follow_up_at') || ''
      if (nfa) {
        var msNfa = new Date(nfa.replace(' ', 'T') + 'Z').getTime()
        if (!isNaN(msNfa) && msNfa > nowMs) return true
      }
      var step = custRec.getString('follow_up_step') || ''
      var ps = custRec.getString('persistence_status') || ''
      if (step && step !== 'finalizado' && ps === 'ativo') return true
    } catch (_) {}
    return false
  }
  // Temperatura: frequência de msgs do cliente (7 dias) + intenção detectada nas msgs
  function maestroDerivaTemperatura(freqSeteDias, intencoes) {
    if (freqSeteDias >= 4 || intencoes.forte) return 'quente'
    if (freqSeteDias >= 1 || intencoes.media) return 'morno'
    return 'frio'
  }
  function maestroExtraiInteresse(convs) {
    var termosRegiao = [
      'vistage',
      'litoral',
      'florianopolis',
      'fpolis',
      'sao jose',
      'palhoca',
      'biguacu',
      'centro',
      'campeche',
      'kobrasol',
      'colinas',
      'capoeiras',
      'pedra branca',
      'ingleses',
      'canasvieiras',
      'jurerê',
      'jurerê internacional',
      'villa dos acores',
      'opus',
      'barra sul',
    ]
    var intent = { forte: false, media: false, termos: [] }
    var interesse = ''
    var val = ''
    for (var i = 0; i < convs.length; i++) {
      var raw = String(convs[i].getString('content') || '')
      var t = maestroNormTxt(raw)
      if (!t) continue
      // valor: "até 450000" / "450 mil" / "r$ 450.000"
      var mVal = t.match(/(r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,8})/g)
      if (!val && mVal) {
        for (var v = 0; v < mVal.length; v++) {
          var num = parseInt(String(mVal[v]).replace(/[^\d]/g, ''), 10)
          if (num >= 50000 && num <= 20000000) {
            val = 'faixa de valor citada: até R$ ' + num.toLocaleString('pt-BR')
            break
          }
        }
      }
      for (var r = 0; r < termosRegiao.length; r++) {
        if (t.indexOf(termosRegiao[r]) !== -1 && interesse.indexOf(termosRegiao[r]) === -1) {
          var termo = termosRegiao[r]
          // capitaliza 1ª letra
          interesse += (interesse ? ' · ' : '') + termo.charAt(0).toUpperCase() + termo.slice(1)
          break
        }
      }
      if (
        /quero|procuro|gostaria|interesse|quanto custa|valor|preco|tabela|planta|visita|agendar|unidade/.test(
          t,
        )
      )
        intent.media = true
      if (/urgente|hoje|agora|posso ir|quando posso|fechar|proposta|entrada|financ/.test(t))
        intent.forte = true
    }
    if (val) interesse = (interesse ? interesse + ' · ' : '') + val
    intent.termos = interesse ? interesse.split(' · ') : []
    return { interesse: interesse || 'não detectado', intencoes: intent }
  }
  function maestroMotivoHumano(convs, semRespostaMs) {
    var motivos = []
    var tudo = ''
    for (var i = 0; i < convs.length; i++) {
      var t = maestroNormTxt(convs[i].getString('content'))
      if (t) tudo += '\n' + t
    }
    if (/corretor|atendente humano|falar com alguem|mauro|encaminh|transbord/.test(tudo))
      motivos.push('pediu transbordo para corretor/humano')
    if (/cancelar|parem|nao quero mais|absurdo|reclamacao|reclamando|incompeten|engan/.test(tudo))
      motivos.push('frustração demonstrada')
    if (semRespostaMs > 2 * 3600 * 1000) motivos.push('sem resposta da Bia há +2h')
    return motivos
  }
  function maestroRunCrmPhase(appRef, cicloRef, sinceIso) {
    var res = {
      analisados: 0,
      enriquecidos: 0,
      quentes: 0,
      mornos: 0,
      frios: 0,
      needs_human: 0,
      skips_campanha: 0,
      erros: [],
    }
    try {
      // Clientes com conversa ativa no período: agrupa msgs inbound por customer_id
      var msgs = appRef.findRecordsByFilter(
        'conversations',
        "created >= '" + sinceIso + "' && (sender = 'customer' || sender = 'user')",
        '-created',
        400,
        0,
      )
      var porCliente = {}
      var ordemIds = []
      for (var i = 0; i < msgs.length; i++) {
        var cid = String(msgs[i].getString('customer_id') || '')
        if (!cid) continue
        if (!porCliente[cid]) {
          porCliente[cid] = []
          ordemIds.push(cid)
        }
        porCliente[cid].push(msgs[i])
      }
      var nowMs = Date.now()
      for (var c = 0; c < ordemIds.length; c++) {
        var cidC = ordemIds[c]
        var convsC = porCliente[cidC]
        res.analisados++
        try {
          var cust = appRef.findRecordById('customers', cidC)
          if (!cust) continue
          if (maestroEmCampanhaAtiva(appRef, cust, nowMs)) {
            res.skips_campanha++
            console.log(
              '[MAESTRO][CRM] skip (campanha/régua ativa): cliente ' +
                cidC +
                ' (' +
                (cust.getString('name') || '?') +
                ')',
            )
            continue
          }
          // frequência de msgs nos últimos 7 dias
          var freq7 = 0
          try {
            freq7 = appRef.countRecords(
              'conversations',
              "customer_id = '" +
                cidC +
                "' && sender = 'customer' && created >= '" +
                maestroDateOffset(-7) +
                "'",
            )
          } catch (_) {}
          var ex = maestroExtraiInteresse(convsC)
          var temperatura = maestroDerivaTemperatura(freq7, ex.intencoes)
          // sem resposta? última msg do cliente é mais recente que a última da Bia
          var semRespMs = 0
          try {
            var lastUser = appRef.findFirstRecordByFilter(
              'conversations',
              "customer_id = '" + cidC + "' && (sender = 'customer' || sender = 'user')",
              '-created',
            )
            var lastAi = appRef.findFirstRecordByFilter(
              'conversations',
              "customer_id = '" + cidC + "' && sender = 'ai'",
              '-created',
            )
            if (lastUser) {
              var msU = new Date(lastUser.getString('created')).getTime()
              var msA = lastAi ? new Date(lastAi.getString('created')).getTime() : 0
              if (msU > msA) semRespMs = nowMs - msU
            }
          } catch (_) {}
          var motivos = maestroMotivoHumano(convsC, semRespMs)
          var needsHuman = motivos.length > 0
          try {
            cust.set('maestro_temperature', temperatura)
            cust.set('maestro_interest', ex.interesse.substring(0, 395))
            cust.set('maestro_needs_human', needsHuman)
            cust.set('maestro_updated_at', new Date().toISOString())
            appRef.saveNoValidate(cust)
            res.enriquecidos++
            if (temperatura === 'quente') res.quentes++
            else if (temperatura === 'morno') res.mornos++
            else res.frios++
            if (needsHuman) {
              res.needs_human++
              console.log(
                '[MAESTRO][CRM] needs_human: cliente ' +
                  cidC +
                  ' (' +
                  (cust.getString('name') || '?') +
                  ') — ' +
                  motivos.join('; '),
              )
            }
          } catch (sErr) {
            res.erros.push(String(cidC) + ': ' + (sErr && sErr.message ? sErr.message : sErr))
          }
        } catch (custErr) {
          res.erros.push(
            String(cidC) + ': ' + (custErr && custErr.message ? custErr.message : custErr),
          )
        }
      }
      console.log(
        '[MAESTRO][CRM] fase concluída — analisados=' +
          res.analisados +
          ', enriquecidos=' +
          res.enriquecidos +
          ' (Q=' +
          res.quentes +
          '/M=' +
          res.mornos +
          '/F=' +
          res.frios +
          ')' +
          ', needs_human=' +
          res.needs_human +
          ', skips_campanha=' +
          res.skips_campanha,
      )
    } catch (crmErr) {
      console.warn(
        '[MAESTRO][CRM] fase falhou (não-fatal): ' +
          (crmErr && crmErr.message ? crmErr.message : crmErr),
      )
      res.erros.push('fase: ' + (crmErr && crmErr.message ? crmErr.message : crmErr))
    }
    return res
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
      // Ciclo de hoje já rodou — a fase CRM continua rodando (enriquecimento é idempotente)
      // Fase CRM analisa os ÚLTIMOS 7 DIAS (prospect que conversou esta semana e esfriou precisa de classificação)
      var sinceIsoR2 = maestroDateOffset(-7)
      try {
        maestroRunCrmPhase(app, ciclo, sinceIsoR2)
      } catch (crmOuterR2) {
        console.warn(
          '[MAESTRO][CRM] fase (re-run cron) falhou (não-fatal): ' +
            (crmOuterR2 && crmOuterR2.message ? crmOuterR2.message : crmOuterR2),
        )
      }
      outcome.ok = true
      outcome.insightId = existing.id
      outcome.status = 'already_ran_today'
      console.log(
        '[MAESTRO] Ciclo ' +
          ciclo +
          ' já rodou hoje (id ' +
          existing.id +
          ') — fase CRM re-executada.',
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

    // 2-B. FASE CRM: enriquecimento de perfis (antes da IA, nunca bloqueia o ciclo)
    var crmPhase = {
      analisados: 0,
      enriquecidos: 0,
      quentes: 0,
      mornos: 0,
      frios: 0,
      needs_human: 0,
      skips_campanha: 0,
      erros: [],
    }
    try {
      // Fase CRM analisa os ÚLTIMOS 7 DIAS (prospect que conversou esta semana e esfriou precisa de classificação)
      crmPhase = maestroRunCrmPhase(app, ciclo, maestroDateOffset(-7))
    } catch (crmOuter) {
      console.warn(
        '[MAESTRO][CRM] fase falhou (não-fatal): ' +
          (crmOuter && crmOuter.message ? crmOuter.message : crmOuter),
      )
    }
    metrics.crm_clientes_analisados = crmPhase.analisados
    metrics.crm_clientes_enriquecidos = crmPhase.enriquecidos
    metrics.crm_quentes = crmPhase.quentes
    metrics.crm_mornos = crmPhase.mornos
    metrics.crm_frios = crmPhase.frios
    metrics.crm_needs_human = crmPhase.needs_human
    metrics.crm_skips_campanha = crmPhase.skips_campanha

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
          ' learnings, CRM: ' +
          crmPhase.enriquecidos +
          ' enriquecidos/' +
          crmPhase.needs_human +
          ' needs_human).',
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
    // ---------- FASE CRM: helpers de enriquecimento (inline, sem IA) ----------
    function maestroNormTxt(s) {
      return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    }
    function maestroEmCampanhaAtiva(appRef, custRec, nowMs) {
      try {
        var nfa = custRec.getString('next_follow_up_at') || ''
        if (nfa) {
          var msNfa = new Date(nfa.replace(' ', 'T') + 'Z').getTime()
          if (!isNaN(msNfa) && msNfa > nowMs) return true
        }
        var step = custRec.getString('follow_up_step') || ''
        var ps = custRec.getString('persistence_status') || ''
        if (step && step !== 'finalizado' && ps === 'ativo') return true
      } catch (_) {}
      return false
    }
    function maestroDerivaTemperatura(freqSeteDias, intencoes) {
      if (freqSeteDias >= 4 || intencoes.forte) return 'quente'
      if (freqSeteDias >= 1 || intencoes.media) return 'morno'
      return 'frio'
    }
    function maestroExtraiInteresse(convs) {
      var termosRegiao = [
        'vistage',
        'litoral',
        'florianopolis',
        'fpolis',
        'sao jose',
        'palhoca',
        'biguacu',
        'centro',
        'campeche',
        'kobrasol',
        'colinas',
        'capoeiras',
        'pedra branca',
        'ingleses',
        'canasvieiras',
        'jurerê',
        'jurerê internacional',
        'villa dos acores',
        'opus',
        'barra sul',
      ]
      var intent = { forte: false, media: false, termos: [] }
      var interesse = ''
      var val = ''
      for (var i = 0; i < convs.length; i++) {
        var raw = String(convs[i].getString('content') || '')
        var t = maestroNormTxt(raw)
        if (!t) continue
        var mVal = t.match(/(r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d{4,8})/g)
        if (!val && mVal) {
          for (var v = 0; v < mVal.length; v++) {
            var num = parseInt(String(mVal[v]).replace(/[^\d]/g, ''), 10)
            if (num >= 50000 && num <= 20000000) {
              val = 'faixa de valor citada: até R$ ' + num.toLocaleString('pt-BR')
              break
            }
          }
        }
        for (var r = 0; r < termosRegiao.length; r++) {
          if (t.indexOf(termosRegiao[r]) !== -1 && interesse.indexOf(termosRegiao[r]) === -1) {
            var termo = termosRegiao[r]
            interesse += (interesse ? ' · ' : '') + termo.charAt(0).toUpperCase() + termo.slice(1)
            break
          }
        }
        if (
          /quero|procuro|gostaria|interesse|quanto custa|valor|preco|tabela|planta|visita|agendar|unidade/.test(
            t,
          )
        )
          intent.media = true
        if (/urgente|hoje|agora|posso ir|quando posso|fechar|proposta|entrada|financ/.test(t))
          intent.forte = true
      }
      if (val) interesse = (interesse ? interesse + ' · ' : '') + val
      intent.termos = interesse ? interesse.split(' · ') : []
      return { interesse: interesse || 'não detectado', intencoes: intent }
    }
    function maestroMotivoHumano(convs, semRespostaMs) {
      var motivos = []
      var tudo = ''
      for (var i = 0; i < convs.length; i++) {
        var t = maestroNormTxt(convs[i].getString('content'))
        if (t) tudo += '\n' + t
      }
      if (/corretor|atendente humano|falar com alguem|mauro|encaminh|transbord/.test(tudo))
        motivos.push('pediu transbordo para corretor/humano')
      if (/cancelar|parem|nao quero mais|absurdo|reclamacao|reclamando|incompeten|engan/.test(tudo))
        motivos.push('frustração demonstrada')
      if (semRespostaMs > 2 * 3600 * 1000) motivos.push('sem resposta da Bia há +2h')
      return motivos
    }
    function maestroRunCrmPhase(appRef, cicloRef, sinceIso) {
      var res = {
        analisados: 0,
        enriquecidos: 0,
        quentes: 0,
        mornos: 0,
        frios: 0,
        needs_human: 0,
        skips_campanha: 0,
        erros: [],
      }
      try {
        var msgs = appRef.findRecordsByFilter(
          'conversations',
          "created >= '" + sinceIso + "' && (sender = 'customer' || sender = 'user')",
          '-created',
          400,
          0,
        )
        var porCliente = {}
        var ordemIds = []
        for (var i = 0; i < msgs.length; i++) {
          var cid = String(msgs[i].getString('customer_id') || '')
          if (!cid) continue
          if (!porCliente[cid]) {
            porCliente[cid] = []
            ordemIds.push(cid)
          }
          porCliente[cid].push(msgs[i])
        }
        var nowMs = Date.now()
        for (var c = 0; c < ordemIds.length; c++) {
          var cidC = ordemIds[c]
          var convsC = porCliente[cidC]
          res.analisados++
          try {
            var cust = appRef.findRecordById('customers', cidC)
            if (!cust) continue
            if (maestroEmCampanhaAtiva(appRef, cust, nowMs)) {
              res.skips_campanha++
              console.log(
                '[MAESTRO][CRM] skip (campanha/régua ativa): cliente ' +
                  cidC +
                  ' (' +
                  (cust.getString('name') || '?') +
                  ')',
              )
              continue
            }
            var freq7 = 0
            try {
              freq7 = appRef.countRecords(
                'conversations',
                "customer_id = '" +
                  cidC +
                  "' && sender = 'customer' && created >= '" +
                  maestroDateOffset(-7) +
                  "'",
              )
            } catch (_) {}
            var ex = maestroExtraiInteresse(convsC)
            var temperatura = maestroDerivaTemperatura(freq7, ex.intencoes)
            var semRespMs = 0
            try {
              var lastUser = appRef.findFirstRecordByFilter(
                'conversations',
                "customer_id = '" + cidC + "' && (sender = 'customer' || sender = 'user')",
                '-created',
              )
              var lastAi = appRef.findFirstRecordByFilter(
                'conversations',
                "customer_id = '" + cidC + "' && sender = 'ai'",
                '-created',
              )
              if (lastUser) {
                var msU = new Date(lastUser.getString('created')).getTime()
                var msA = lastAi ? new Date(lastAi.getString('created')).getTime() : 0
                if (msU > msA) semRespMs = nowMs - msU
              }
            } catch (_) {}
            var motivos = maestroMotivoHumano(convsC, semRespMs)
            var needsHuman = motivos.length > 0
            try {
              cust.set('maestro_temperature', temperatura)
              cust.set('maestro_interest', ex.interesse.substring(0, 395))
              cust.set('maestro_needs_human', needsHuman)
              cust.set('maestro_updated_at', new Date().toISOString())
              appRef.saveNoValidate(cust)
              res.enriquecidos++
              if (temperatura === 'quente') res.quentes++
              else if (temperatura === 'morno') res.mornos++
              else res.frios++
              if (needsHuman) {
                res.needs_human++
                console.log(
                  '[MAESTRO][CRM] needs_human: cliente ' +
                    cidC +
                    ' (' +
                    (cust.getString('name') || '?') +
                    ') — ' +
                    motivos.join('; '),
                )
              }
            } catch (sErr) {
              res.erros.push(String(cidC) + ': ' + (sErr && sErr.message ? sErr.message : sErr))
            }
          } catch (custErr) {
            res.erros.push(
              String(cidC) + ': ' + (custErr && custErr.message ? custErr.message : custErr),
            )
          }
        }
        console.log(
          '[MAESTRO][CRM] fase concluída — analisados=' +
            res.analisados +
            ', enriquecidos=' +
            res.enriquecidos +
            ' (Q=' +
            res.quentes +
            '/M=' +
            res.mornos +
            '/F=' +
            res.frios +
            ')' +
            ', needs_human=' +
            res.needs_human +
            ', skips_campanha=' +
            res.skips_campanha,
        )
      } catch (crmErr) {
        console.warn(
          '[MAESTRO][CRM] fase falhou (não-fatal): ' +
            (crmErr && crmErr.message ? crmErr.message : crmErr),
        )
      }
      return res
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
        // Ciclo de hoje já rodou — mas a fase CRM roda de novo (enriquecimento é idempotente)
        // Fase CRM analisa os ÚLTIMOS 7 DIAS (prospect que conversou esta semana e esfriou precisa de classificação)
        var sinceIsoR = maestroDateOffset(-7)
        var crmPhaseR = {
          analisados: 0,
          enriquecidos: 0,
          quentes: 0,
          mornos: 0,
          frios: 0,
          needs_human: 0,
          skips_campanha: 0,
          erros: [],
        }
        try {
          crmPhaseR = maestroRunCrmPhase(app, ciclo, sinceIsoR)
        } catch (crmOuterR) {
          console.warn(
            '[MAESTRO][CRM] fase (re-run manual) falhou (não-fatal): ' +
              (crmOuterR && crmOuterR.message ? crmOuterR.message : crmOuterR),
          )
        }
        outcome.ok = true
        outcome.insightId = existing.id
        outcome.status = 'already_ran_today_crm'
        console.log(
          '[MAESTRO] Ciclo ' +
            ciclo +
            ' já tinha rodado — fase CRM re-executada: ' +
            crmPhaseR.enriquecidos +
            ' enriquecidos/' +
            crmPhaseR.needs_human +
            ' needs_human.',
        )
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

      // 2-B. FASE CRM: enriquecimento de perfis (antes da IA, nunca bloqueia o ciclo)
      var crmPhase2 = {
        analisados: 0,
        enriquecidos: 0,
        quentes: 0,
        mornos: 0,
        frios: 0,
        needs_human: 0,
        skips_campanha: 0,
        erros: [],
      }
      try {
        // Fase CRM analisa os ÚLTIMOS 7 DIAS (prospect que conversou esta semana e esfriou precisa de classificação)
        crmPhase2 = maestroRunCrmPhase(app, ciclo, maestroDateOffset(-7))
      } catch (crmOuter2) {
        console.warn(
          '[MAESTRO][CRM] fase falhou (não-fatal): ' +
            (crmOuter2 && crmOuter2.message ? crmOuter2.message : crmOuter2),
        )
      }
      metrics.crm_clientes_analisados = crmPhase2.analisados
      metrics.crm_clientes_enriquecidos = crmPhase2.enriquecidos
      metrics.crm_quentes = crmPhase2.quentes
      metrics.crm_mornos = crmPhase2.mornos
      metrics.crm_frios = crmPhase2.frios
      metrics.crm_needs_human = crmPhase2.needs_human
      metrics.crm_skips_campanha = crmPhase2.skips_campanha

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
            ' learnings, CRM: ' +
            crmPhase2.enriquecidos +
            ' enriquecidos/' +
            crmPhase2.needs_human +
            ' needs_human).',
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

// ============================ ROTA CRM: clientes que precisam de humano (painel) ============================
routerAdd(
  'GET',
  '/backend/v1/maestro_crm_needs',
  function (e) {
    function crmNormTxt(s) {
      return String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    }
    try {
      var rows = $app.findRecordsByFilter(
        'customers',
        'maestro_needs_human = true',
        '-maestro_updated_at',
        25,
        0,
      )
      var out = []
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i]
        var lastConv = null
        try {
          lastConv = $app.findFirstRecordByFilter(
            'conversations',
            "customer_id = '" + r.id + "' && (sender = 'customer' || sender = 'user')",
            '-created',
          )
        } catch (_) {}
        // Motivo real: recalcula dos sinais das últimas conversas (mesmos gatilhos da fase CRM)
        var motivos = []
        try {
          var convsR = $app.findRecordsByFilter(
            'conversations',
            "customer_id = '" + r.id + "' && (sender = 'customer' || sender = 'user')",
            '-created',
            20,
            0,
          )
          var tudo = ''
          for (var m = 0; m < convsR.length; m++) {
            var tR = crmNormTxt(convsR[m].getString('content'))
            if (tR) tudo += '\n' + tR
          }
          if (/corretor|atendente humano|falar com alguem|mauro|encaminh|transbord/.test(tudo))
            motivos.push('pediu transbordo para corretor/humano')
          if (
            /cancelar|parem|nao quero mais|absurdo|reclamacao|reclamando|incompeten|engan/.test(
              tudo,
            )
          )
            motivos.push('frustração demonstrada')
          // sem resposta: última msg do cliente mais recente que a última da Bia
          try {
            var lastAiR = $app.findFirstRecordByFilter(
              'conversations',
              "customer_id = '" + r.id + "' && sender = 'ai'",
              '-created',
            )
            if (lastConv) {
              var msU2 = new Date(lastConv.getString('created')).getTime()
              var msA2 = lastAiR ? new Date(lastAiR.getString('created')).getTime() : 0
              if (msU2 > msA2 && Date.now() - msU2 > 2 * 3600 * 1000)
                motivos.push('sem resposta da Bia há +2h')
            }
          } catch (_) {}
        } catch (_) {}
        if (motivos.length === 0) motivos.push('sinalizado pelo último ciclo do Maestro')
        out.push({
          id: r.id,
          name: r.getString('name') || '(sem nome)',
          phone: r.getString('phone') || '',
          channel_hint: '',
          interest: r.getString('maestro_interest') || '',
          motivo: motivos.join('; '),
          temperature: r.getString('maestro_temperature') || '',
          last_message: lastConv
            ? String(lastConv.getString('content') || '').substring(0, 200)
            : '',
          last_message_at: lastConv ? lastConv.getString('created') : '',
          maestro_updated_at: r.getString('maestro_updated_at'),
          status: r.getString('status') || '',
        })
      }
      return e.json(200, { clientes: out })
    } catch (err) {
      return e.json(500, { clientes: [], error: String(err) })
    }
  },
  $apis.requireAuth(),
)
