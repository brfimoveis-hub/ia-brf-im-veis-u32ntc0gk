/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000004 — CONSTITUIÇÃO BIA v7: POLISH FINAL DE DEDUPLICAÇÃO
// ----------------------------------------------------------------------------
// Revisão final consolidada da v7 (migration 1763000003). O diagnóstico do dono
// criticava "regras duplicadas em vários lugares". A revisão achou UM resquício:
// a regra de anti-alucinação ("sem dado confirmado → 'vou confirmar com o
// corretor'; nunca inventar") aparecia como regra AUTÔNOMA em 3 seções:
//   - Seção 2 (ANTES-DE-CONTINUAR): eco "Sem dado confirmado... nunca invente"
//   - Seção 5 (REGRA DE OURO): duplicação interna da mesma linha (resquício da
//     fusão da regra truncada da v6.1)
//   - Seção 6: a regra canônica (REGRA ÚNICA) — permanece
// Esta migration aplica SOMENTE duas deduplicações, mantendo TODO o resto do
// texto byte a byte igual:
//   a) Seção 2, linha ANTES-DE-CONTINUAR vira: "- ANTES-DE-CONTINUAR: antes de
//      continuar qualquer template ou fluxo, responda ao que o cliente
//      perguntou. (A regra de dados e anti-alucinação da seção 6 se aplica a
//      toda resposta.)"
//   b) Seção 5, primeira linha vira UMA frase única: "- REGRA DE OURO: todas as
//      respostas sobre valores, tabelas, plantas, metragens e condições vêm
//      EXCLUSIVAMENTE do estoque e da tabela oficial do CRM, atualizada mês a
//      mês; sem dado confirmado, aplica-se a regra única da seção 6."
// As menções contextuais nas seções 3 ("nunca invente opções") e 4 ("consulte
// o catálogo") permanecem — são situacionais, não a regra duplicada.
// NÃO altera: priority (2500), is_active, seções 1, 3, 4, 7, 8, 9, régua
// pausada, nenhum outro registro.
// Pós-gravação: sincroniza users.bia_instructions (e users.ai_instructions
// quando tinha valor não-vazio); scrub de telefones herdado da 1763000003
// permanece válido (o novo texto não introduz nenhum número).
// Idempotente: no-op em banco vazio; se nada a fazer, não grava nada. Rodar 2x
// produz exatamente o mesmo texto.
// ============================================================================

migrate(
  (app) => {
    console.log('[MIGRATION 1763000004] Iniciando polish final da Constituição Bia v7...')

    // ------------------------------------------------------------------
    // TEXTOS
    // ------------------------------------------------------------------
    const SECTION2_OLD = `- ANTES-DE-CONTINUAR: antes de continuar qualquer template ou fluxo, responda ao que o cliente perguntou. Sem dado confirmado, diga "vou confirmar com o corretor" — nunca invente preço, prazo ou metragem.`
    const SECTION2_NEW = `- ANTES-DE-CONTINUAR: antes de continuar qualquer template ou fluxo, responda ao que o cliente perguntou. (A regra de dados e anti-alucinação da seção 6 se aplica a toda resposta.)`

    const SECTION5_OLD = `- Todos os valores vêm EXCLUSIVAMENTE do estoque e da tabela oficial do CRM, atualizada mês a mês. Todas as respostas sobre valores, tabelas, plantas, metragens e condições devem vir exclusivamente do estoque do CRM; sem dado confirmado, dizer "vou confirmar com o corretor".`
    const SECTION5_NEW = `- REGRA DE OURO: todas as respostas sobre valores, tabelas, plantas, metragens e condições vêm EXCLUSIVAMENTE do estoque e da tabela oficial do CRM, atualizada mês a mês; sem dado confirmado, aplica-se a regra única da seção 6.`

    // ------------------------------------------------------------------
    // SCRUB DE TELEFONES (herdado da 1763000003 — segurança, não altera o
    // texto alvo, só neutraliza qualquer telefone residual)
    // ------------------------------------------------------------------
    var PHONE_PATTERNS = [
      /\(\s*\+?55\s*\)?\s*\(?\s*4?8\s*\)?\s*9?\s*9972[\s.\-]*8050/gi,
      /\(\s*4?8\s*\)\s*9?\s*9972[\s.\-]*8050/gi,
      /\+?55\s*\(?\s*4?8\s*\)?\s*9?\s*9972[\s.\-]*8050/gi,
      /9\s*9\s*9\s*7\s*2\s*[\s.\-]*8\s*0\s*5\s*0/g,
      /9972[\s.\-]*8050/gi,
      /9920[\s.\-]*8050/gi,
      /99182[\s.\-]*8050/gi,
      /999728050/gi,
      /99208050/gi,
      /991828050/gi,
    ]

    function hasPhone(text) {
      if (!text) return false
      var s = String(text)
      for (var i = 0; i < PHONE_PATTERNS.length; i++) {
        if (PHONE_PATTERNS[i].test(s)) return true
      }
      return false
    }

    function scrubText(text) {
      if (!hasPhone(text)) return String(text)
      var out = String(text)
      for (var i = 0; i < PHONE_PATTERNS.length; i++) {
        out = out.replace(PHONE_PATTERNS[i], '[número suprimido]')
      }
      return out
    }

    // ------------------------------------------------------------------
    // 1. LOCALIZAR O REGISTRO SOBERANO v7 (priority 2500, ativo, título v7)
    // ------------------------------------------------------------------
    var constitution = null
    try {
      constitution = app.findRecordById('bia_learnings', 'oxn4280sma7d888')
    } catch (_) {}

    if (
      constitution &&
      (!constitution.getBool('is_active') ||
        String(constitution.getString('title') || '').indexOf('v7') === -1)
    ) {
      constitution = null
    }

    if (!constitution) {
      try {
        const candidates = app.findRecordsByFilter(
          'bia_learnings',
          'priority = 2500 && is_active = true',
          '-updated',
          10,
          0,
        )
        for (var c = 0; c < candidates.length; c++) {
          var title = String(candidates[c].getString('title') || '')
          if (title.indexOf('v7') !== -1) {
            constitution = candidates[c]
            break
          }
        }
      } catch (_) {}
    }

    if (!constitution) {
      console.log(
        '[MIGRATION 1763000004] Registro v7 (p2500, ativo, título contendo v7) não encontrado — no-op.',
      )
      return
    }

    const recordId = constitution.id

    // ------------------------------------------------------------------
    // 2. DEDUPLICAR o rule_text (só se o texto antigo ainda estiver lá)
    // ------------------------------------------------------------------
    var originalText = String(constitution.getString('rule_text') || '')
    var newText = originalText
    var appliedChanges = 0

    if (newText.indexOf(SECTION2_OLD) !== -1) {
      newText = newText.split(SECTION2_OLD).join(SECTION2_NEW)
      appliedChanges++
      console.log('[MIGRATION 1763000004] Seção 2: eco da anti-alucinação removido.')
    }
    if (newText.indexOf(SECTION5_OLD) !== -1) {
      newText = newText.split(SECTION5_OLD).join(SECTION5_NEW)
      appliedChanges++
      console.log('[MIGRATION 1763000004] Seção 5: duplicação interna removida.')
    }

    // 3. Scrub de telefones no NOVO texto (não deve introduzir nenhum número)
    var scrubbedText = scrubText(newText)
    if (scrubbedText !== newText) {
      console.warn(
        '[MIGRATION 1763000004] Scrub de telefones aplicado ao novo texto (não deveria haver nenhum).',
      )
      newText = scrubbedText
    }

    if (newText === originalText) {
      console.log(
        '[MIGRATION 1763000004] Nada a fazer: texto já está na versão deduplicada — no-op.',
      )
      return
    }

    constitution.set('rule_text', newText)
    app.saveNoValidate(constitution)
    console.log(
      '[MIGRATION 1763000004] rule_text deduplicado no registro ' +
        recordId +
        ' (' +
        appliedChanges +
        ' mudança(s)).',
    )

    // ------------------------------------------------------------------
    // 4. SINCRONIZAR users com o NOVO texto
    //    - bia_instructions: sempre
    //    - ai_instructions: só quando tinha valor não-vazio (não inventa valor)
    // ------------------------------------------------------------------
    var usersSynced = 0
    try {
      const users = app.findRecordsByFilter('users', '1=1', '-created', 50, 0)
      for (var u = 0; u < users.length; u++) {
        const user = users[u]
        try {
          var biaInstr = ''
          try {
            biaInstr = String(user.getString('bia_instructions') || '')
          } catch (_) {}
          if (biaInstr !== newText) {
            user.set('bia_instructions', newText)
            app.saveNoValidate(user)
            usersSynced++
          }
          var aiInstr = ''
          try {
            aiInstr = String(user.getString('ai_instructions') || '')
          } catch (_) {}
          if (aiInstr !== '' && aiInstr !== newText) {
            user.set('ai_instructions', newText)
            app.saveNoValidate(user)
            usersSynced++
          }
        } catch (uErr) {
          console.warn('[MIGRATION 1763000004] Falha ao sincronizar user: ' + uErr.message)
        }
      }
      console.log('[MIGRATION 1763000004] users sincronizados (' + usersSynced + ' gravação(ões)).')
    } catch (e2) {
      console.warn('[MIGRATION 1763000004] Aviso ao sincronizar users: ' + e2.message)
    }

    // ------------------------------------------------------------------
    // 5. LOG DE AUDITORIA
    // ------------------------------------------------------------------
    try {
      const logsCol = app.findCollectionByNameOrId('system_logs')
      const log = new Record(logsCol)
      log.set('user_id', '')
      log.set('type', 'bia_constitution_v7_final_polish')
      log.set(
        'message',
        'Revisão final v7: deduplicação da regra de anti-alucinação (' +
          appliedChanges +
          ' seção(ões): ' +
          (appliedChanges === 2 ? '2 e 5' : appliedChanges === 1 ? 'parcial' : 'nenhuma') +
          '). Regra autônoma agora só na seção 6. users sincronizados (' +
          usersSynced +
          ').',
      )
      log.set(
        'details',
        JSON.stringify({
          record_id: recordId,
          version: 'v7',
          changes: appliedChanges,
          users_synced: usersSynced,
          migration: '1763000004',
        }),
      )
      app.saveNoValidate(log)
    } catch (e3) {
      console.warn('[MIGRATION 1763000004] Aviso ao gravar log de auditoria: ' + e3.message)
    }

    console.log('[MIGRATION 1763000004] Concluída com sucesso.')
  },
  (app) => {
    console.log('[MIGRATION 1763000004 DOWN] Sem reversão (polish final da v7 permanece).')
  },
)
