/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000002 — CORREÇÃO 2b (v0.0.1441): scrub final do telefone +
// desativação do Modo Contínuo de e-book
// ----------------------------------------------------------------------------
// (a) A migration 1763000001 aplicou as REGRAS v6.1, mas o próprio bloco da
//     regra 1 citava o número ("((48) 99972-8050, 99972-8050, 9920-8050 ou
//     qualquer variação)") — ou seja, o telefone VOLTOU a fazer parte do prompt
//     vivo da Constituição (bia_learnings id oxn4280sma7d888, priority 2500).
//     Esta migration remove QUALQUER ocorrência dos números de TODOS os
//     registros ativos de bia_learnings e dos prompts em users.ai_instructions,
//     reescrevendo a frase da regra 1 para "(qualquer variação)".
// (b) DESATIVA o Modo Contínuo de e-book (app_controls.key='ebook_continuous_mode'):
//     está is_active=true com next_batch_at vencido desde 19/10/2026 e o cron
//     ebook_continuous_dispatcher (independente da pausa da régua) dispararia
//     um lote de 15 mensagens às 8h. Pausa da régua NÃO o cobre.
// Idempotente: no-op em banco vazio e quando nada resta a limpar/desativar.
// ============================================================================
migrate(
  (app) => {
    var PHONE_PATTERNS = [
      /\(\(48\)\s*99972-8050,\s*99972-8050,\s*9920-8050\s*ou qualquer variação\)/g,
      /\(\s*99972-8050,\s*99972-8050,\s*9920-8050\s*ou qualquer variação\s*\)/g,
      /\+?55\s*\(?\s*4?8\s*\)?\s*9?\s*9972[\s.\-]*8050/g,
      /\(?\s*4?8\s*\)?\s*9?\s*9972[\s.\-]*8050/g,
      /9972[\s.\-]*8050/g,
      /9920[\s.\-]*8050/g,
      /999728050/g,
      /99208050/g,
    ]

    function scrubPhone(text) {
      if (!text) return { text: text || '', changed: false }
      var out = String(text)
      var changed = false
      for (var i = 0; i < PHONE_PATTERNS.length; i++) {
        var before = out
        out = out.replace(PHONE_PATTERNS[i], i < 2 ? '(qualquer variação)' : '')
        if (out !== before) changed = true
      }
      if (changed) {
        out = out.replace(/no WhatsApp pessoal dele:?/gi, ' por este mesmo chat')
        out = out.replace(/no WhatsApp pessoal do Mauro:?/gi, ' por este mesmo chat')
        out = out.replace(/no telefone pessoal dele:?/gi, ' por este mesmo chat')
        out = out.replace(/\(\s*,\s*\)+/g, '')
        out = out.replace(/\(\s*\)/g, '')
        out = out.replace(/[ \t]{2,}/g, ' ')
        out = out.replace(/ +([.,;!])/g, '$1')
      }
      return { text: out, changed: changed }
    }

    function hasPhone(text) {
      if (!text) return false
      for (var i = 2; i < PHONE_PATTERNS.length; i++) {
        if (PHONE_PATTERNS[i].test(String(text))) {
          PHONE_PATTERNS[i].lastIndex = 0
          return true
        }
        PHONE_PATTERNS[i].lastIndex = 0
      }
      return false
    }

    var updated = 0

    // --- (a1) bia_learnings ativos ---
    var records = []
    try {
      records = app.findRecordsByFilter('bia_learnings', 'is_active = true', '-priority', 200, 0)
    } catch (e) {
      console.error('[MIGRATION 1763000002] Falha ao consultar bia_learnings: ' + e.message)
    }
    for (var i = 0; i < records.length; i++) {
      var rec = records[i]
      var orig = rec.getString('rule_text') || ''
      if (!hasPhone(orig)) continue
      var scrubbed = scrubPhone(orig)
      rec.set('rule_text', scrubbed.text)
      app.saveNoValidate(rec)
      updated++
      console.log(
        '[MIGRATION 1763000002] bia_learnings ' +
          rec.id +
          ' (prioridade ' +
          rec.getInt('priority') +
          ') telefone removido do prompt.',
      )
    }

    // --- (a2) users.ai_instructions (prompt de persistência etc.) ---
    var users = []
    try {
      users = app.findRecordsByFilter('users', "ai_instructions != ''", '-updated', 50, 0)
    } catch (e2) {
      console.error('[MIGRATION 1763000002] Falha ao consultar users: ' + e2.message)
    }
    for (var u = 0; u < users.length; u++) {
      var usr = users[u]
      var instr = usr.getString('ai_instructions') || ''
      if (!hasPhone(instr)) continue
      var s2 = scrubPhone(instr)
      usr.set('ai_instructions', s2.text)
      app.saveNoValidate(usr)
      updated++
      console.log('[MIGRATION 1763000002] users ' + usr.id + ' ai_instructions telefonou removido.')
    }

    // --- (b) desativar Modo Contínuo de e-book ---
    var ctrl = null
    try {
      ctrl = app.findFirstRecordByFilter('app_controls', "key = 'ebook_continuous_mode'")
    } catch (_) {}
    if (ctrl && ctrl.getBool('is_active')) {
      ctrl.set('is_active', false)
      var meta = {}
      try {
        var rawMeta = ctrl.get('metadata')
        if (rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta)) meta = rawMeta
        else if (typeof rawMeta === 'string' && rawMeta.trim()) meta = JSON.parse(rawMeta)
      } catch (_) {}
      meta.stop_reason =
        'Desativado em 23/11/2026 por decisão do proprietário: next_batch_at vencido desde 19/10 e cron independente da pausa da régua — nenhum disparo automático sem autorização expressa.'
      meta.next_batch_at = null
      ctrl.set('metadata', JSON.stringify(meta))
      ctrl.set('paused_at', new Date().toISOString().replace('T', ' '))
      ctrl.set('paused_by', 'sistema (migration 1763000002)')
      app.saveNoValidate(ctrl)
      updated++
      console.log('[MIGRATION 1763000002] app_controls ebook_continuous_mode DESATIVADO.')
    }

    try {
      var logsCol = app.findCollectionByNameOrId('system_logs')
      var log = new Record(logsCol)
      log.set('user_id', '')
      log.set('type', 'bia_prompt_scrub_migration')
      log.set(
        'message',
        'Migration 1763000002: telefone do Mauro removido dos prompts vivos da Bia (' +
          updated +
          ' alteração(ões) no total) e Modo Contínuo de e-book desativado.',
      )
      log.set('details', JSON.stringify({ changes: updated, migration: '1763000002' }))
      app.saveNoValidate(log)
    } catch (_) {}

    console.log('[MIGRATION 1763000002] Concluída: ' + updated + ' alteração(ões).')
  },
  (app) => {
    // down: no-op (limpeza de segurança e desativação de disparo não são revertidas)
  },
)
