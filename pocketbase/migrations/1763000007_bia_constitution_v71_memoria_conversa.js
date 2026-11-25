/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000007 — CONSTITUIÇÃO DA BIA v7.1: MEMÓRIA DA CONVERSA
// ----------------------------------------------------------------------------
// Corrige problemas reais provados na conversa Instagram do customer
// w2by9dou6agtz6l (25/11, 14:19–15:37 UTC):
//   1. Bia repetiu pergunta já respondida (dormitórios/tipo) — cliente
//      respondeu "Já te informei" com frustração.
//   2. Re-saudação ("Olá! Que ótimo...") no MEIO da conversa.
//   3. Cliente negou região ("No centro de fpolis não tens nada valor
//      próximo") e a Bia reapresentou o MESMO imóvel já mostrado.
//   4. Loop de "vou confirmar com o corretor" (4x) sem nunca retornar.
//   5. Assumiu preferência não declarada (falou de litoral sem o cliente
//      mencionar litoral).
//
// MUDANÇA: UMA seção nova consolidada "2-A. MEMÓRIA DA CONVERSA" inserida
// no TEXTO ÚNICO da Constituição (registro soberano priority 2500), sem
// duplicar regras existentes e sem empilhar emendas. users.bia_instructions
// sincronizado. Log de auditoria gravado em system_logs. Zero telefones.
// Idempotente: marcador "2-A. MEMÓRIA DA CONVERSA" nunca duplica; no-op em
// banco vazio e quando nada resta a fazer.
// ============================================================================
migrate(
  (app) => {
    console.log('[MIGRATION 1763000007] Iniciando emenda v7.1 (Memória da Conversa)...')

    // ------------------------------------------------------------------
    // SEÇÃO NOVA CONSOLIDADA (inserida entre a seção 2 e a seção 3)
    // ------------------------------------------------------------------
    const MEMORIA_SECTION = `
2-A. MEMÓRIA DA CONVERSA (CONTINUIDADE ABSOLUTA)
a. SAUDAÇÃO ÚNICA: a saudação com identificação ("Olá, sou a Bia, corretora da BRF Imóveis" ou "Olá!") só pode ser usada na PRIMEIRA mensagem da conversa. Em qualquer mensagem seguinte, NUNCA comece com saudação, cumprimento temporal ("Bom dia/Boa tarde") ou re-apresentação — entre direto no assunto.
b. NUNCA REPETIR PERGUNTA RESPONDIDA: antes de formular qualquer pergunta, releia o histórico da conversa. Se o cliente JÁ respondeu aquele ponto (dormitórios, tipo de imóvel, região, orçamento, prazo), trate a resposta dada como FATO CONFIRMADO e siga a partir dela. Se o cliente disser "já te informei", "já respondi" ou similar, NUNCA pergunte de novo — prossiga com o dado que consta no histórico.
c. NEGAÇÃO É FATIVO: quando o cliente nega, descarta ou diz que não tem interesse em uma região, bairro ou imóvel, aquele item fica DESCARTADO para o resto da conversa. NUNCA reapresente o mesmo imóvel ou a mesma região negada — apresente apenas alternativa diferente ou reconheça com honestidade que não há opção naquele perfil.
d. PROMESSA COM RETORNO: a frase "vou confirmar com o corretor" só pode ser usada UMA vez por assunto. Se já foi dita sobre aquele assunto, NÃO repita a promessa: emita [PROMISE_PENDING: true] e [PROMISE_CONTEXT: <detalhes>] uma única vez para registro no CRM e diga apenas que o retorno está em andamento. Nunca entre em loop de re-promessas.
e. NÃO ASSUMIR PREFERÊNCIAS: só fale de região, bairro ou tipo de imóvel que o CLIENTE mencionou. Não induza nem direcione ("no litoral...", "você prefere o litoral?") se ele não falou sobre isso.
`

    // ------------------------------------------------------------------
    // 1. LOCALIZAR REGISTRO SOBERANO (priority 2500) E EMENDAR O TEXTO ÚNICO
    // ------------------------------------------------------------------
    var constitution = null
    try {
      constitution = app.findRecordById('bia_learnings', 'oxn4280sma7d888')
    } catch (_) {}

    if (!constitution) {
      constitution = app.findFirstRecordByFilter(
        'bia_learnings',
        'priority = 2500 && is_active = true',
      )
    }

    var changed = false
    if (constitution) {
      var currentText = String(constitution.getString('rule_text') || '')
      var newText = currentText

      if (currentText.indexOf('2-A. MEMÓRIA DA CONVERSA') !== -1) {
        console.log(
          '[MIGRATION 1763000007] Seção 2-A já presente no registro ' +
            constitution.id +
            ' — nada a emendar.',
        )
      } else {
        var anchor = '3. LOCAÇÃO'
        var anchorIdx = currentText.indexOf(anchor)
        if (anchorIdx !== -1) {
          newText =
            currentText.slice(0, anchorIdx) +
            MEMORIA_SECTION.trimStart() +
            '\n' +
            currentText.slice(anchorIdx)
        } else {
          // Fallback: banco de cópia sem a v7 completa — anexa a seção ao final
          newText = currentText + '\n' + MEMORIA_SECTION
        }
        constitution.set('rule_text', newText)
        changed = true
        console.log(
          '[MIGRATION 1763000007] Seção 2-A MEMÓRIA DA CONVERSA inserida no registro ' +
            constitution.id +
            ' (priority 2500).',
        )
      }

      // Garante ativo e prioridade soberana
      if (!constitution.getBool('is_active')) {
        constitution.set('is_active', true)
        changed = true
      }
      if ((constitution.getInt('priority') || 0) !== 2500) {
        constitution.set('priority', 2500)
        changed = true
      }
      if (changed) {
        app.saveNoValidate(constitution)
      }
    } else {
      console.log(
        '[MIGRATION 1763000007] Sem registro soberano p2500 (banco vazio/cópia) — nada a emendar.',
      )
    }

    // ------------------------------------------------------------------
    // 2. SINCRONIZAR users.bia_instructions COM O TEXTO EMENDADO
    // ------------------------------------------------------------------
    if (constitution && changed) {
      try {
        const finalText = String(constitution.getString('rule_text') || '')
        const users = app.findRecordsByFilter('users', '1=1', '-created', 10, 0)
        var synced = 0
        for (var u = 0; u < users.length; u++) {
          const user = users[u]
          try {
            if (user.getString('bia_instructions') === finalText) continue
          } catch (_) {}
          user.set('bia_instructions', finalText)
          app.saveNoValidate(user)
          synced++
        }
        console.log(
          '[MIGRATION 1763000007] users.bia_instructions sincronizado (' + synced + ' usuário(s)).',
        )
      } catch (uErr) {
        console.warn(
          '[MIGRATION 1763000007] Aviso ao sincronizar users.bia_instructions: ' + uErr.message,
        )
      }
    }

    // ------------------------------------------------------------------
    // 3. LOG DE AUDITORIA
    // ------------------------------------------------------------------
    if (changed) {
      try {
        const logsCol = app.findCollectionByNameOrId('system_logs')
        const log = new Record(logsCol)
        log.set('user_id', '')
        log.set('type', 'bia_constitution_v71_memoria_conversa')
        log.set(
          'message',
          'Constituição Bia v7.1: seção 2-A "MEMÓRIA DA CONVERSA" inserida no TEXTO ÚNICO (' +
            (constitution ? constitution.id : '') +
            ', priority 2500) — saudação única, nunca repetir pergunta respondida, negação é fativo, promessa com retorno único por assunto ([PROMISE_PENDING]), sem assumir preferências. users.bia_instructions sincronizado.',
        )
        log.set(
          'details',
          JSON.stringify({
            record_id: constitution ? constitution.id : '',
            version: 'v7.1',
            section: '2-A. MEMÓRIA DA CONVERSA',
            evidence: 'conversa Instagram customer w2by9dou6agtz6l 25/11 14:19-15:37 UTC',
            migration: '1763000007',
          }),
        )
        app.saveNoValidate(log)
      } catch (logErr) {
        console.warn('[MIGRATION 1763000007] Aviso no log de auditoria: ' + logErr.message)
      }
    }

    console.log('[MIGRATION 1763000007] Concluída.')
  },
  (app) => {
    console.log('[MIGRATION 1763000007 DOWN] Sem reversão (v7.1 permanece).')
  },
)
