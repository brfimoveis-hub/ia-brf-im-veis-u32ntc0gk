/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000001 — CORREÇÃO 2 (v0.0.1440): prompts da Bia sem telefone
// ----------------------------------------------------------------------------
// (a) Remove TODA menção ao telefone pessoal do Mauro ((48) 99972-8050 e
//     variações, inclusive 9920-8050) de todos os registros ativos de
//     bia_learnings (Constitution v6 priority 2500, texto único priority 1000,
//     prompt de persistência). Transbordo passa a ser "vou encaminhar para o
//     corretor responsável", SEM número.
// (b) Acrescenta regra ANTES-DE-CONTINUAR: pergunta direta do cliente vem
//     primeiro; sem dado na base -> "vou confirmar"; nunca inventar; nunca
//     repetir template da régua ignorando a pergunta.
// (c) Acrescenta trava de coerência: UM imóvel em foco por contato; respostas
//     de valores/tabelas/plantas usam só os dados desse imóvel; troca de
//     imóvel é reconhecida explicitamente; sem dados -> "vou confirmar".
// Idempotente: o bloco de regras só é anexado se o marcador "REGRAS v6.1"
// ainda não existir no texto (nunca duplica).
// ============================================================================
migrate(
  (app) => {
    var PHONE_PATTERNS = [
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
        out = out.replace(PHONE_PATTERNS[i], '')
        if (out !== before) changed = true
      }
      if (changed) {
        out = out.replace(/no WhatsApp pessoal dele:?/gi, ' por este mesmo chat')
        out = out.replace(/no WhatsApp pessoal do Mauro:?/gi, ' por este mesmo chat')
        out = out.replace(/no telefone pessoal dele:?/gi, ' por este mesmo chat')
        out = out.replace(/[ \t]{2,}/g, ' ')
        out = out.replace(/ +([.,;!])/g, '$1')
      }
      return { text: out, changed: changed }
    }

    var RULES_BLOCK = [
      '',
      '### REGRAS v6.1 — OBRIGATÓRIAS (23/11/2026, têm prioridade sobre qualquer texto anterior)',
      '1) TRANSBORDO SEM NÚMERO: NUNCA forneça, cite, confirme ou escreva o telefone pessoal do Mauro ((48) 99972-8050, 99972-8050, 9920-8050 ou qualquer variação). Quando o cliente pedir um humano, o atendimento travar ou você precisar escalar, diga apenas: "Vou encaminhar para o corretor responsável e ele te responde por aqui mesmo." Nenhum número, em nenhuma hipótese.',
      '2) ANTES-DE-CONTINUAR: se o cliente fizer uma pergunta direta (preço, condições, entrega, metragem, planta, localização, formas de pagamento), responda-a PRIMEIRO. Se não souber ou o dado não constar na base de conhecimento, diga "vou confirmar com o corretor e te retorno" — NUNCA invente dados e NUNCA repita o template da régua ignorando a pergunta do cliente.',
      '3) COERÊNCIA DO IMÓVEL EM FOCO: um contato tem UM imóvel em foco por vez (o último sobre o qual ele perguntou pelo código/link). Todas as respostas sobre valores, tabelas, plantas e condições usam APENAS os dados desse imóvel. Se o cliente mudar de assunto para outro imóvel, reconheça a troca explicitamente antes de responder. Se não houver dados do imóvel em foco na base, diga "vou confirmar" — nunca misture dados de outro imóvel.',
    ].join('\n')

    var MARKER = 'REGRAS v6.1'

    var records = []
    try {
      records = app.findRecordsByFilter('bia_learnings', 'is_active = true', '-priority', 100, 0)
    } catch (e) {
      console.error('[MIGRATION 1763000001] Falha ao consultar bia_learnings: ' + e.message)
      return
    }

    var updated = 0
    for (var i = 0; i < records.length; i++) {
      var rec = records[i]
      var orig = rec.getString('rule_text') || ''
      var title = ''
      try {
        title = rec.getString('title') || ''
      } catch (_) {}

      var scrubbed = scrubPhone(orig)
      var nextText = scrubbed.text
      var applied = scrubbed.changed

      var isConstitutionLike =
        rec.getInt('priority') >= 1000 ||
        title.toLowerCase().indexOf('constitu') !== -1 ||
        title.toLowerCase().indexOf('persist') !== -1 ||
        orig.toLowerCase().indexOf('constitui') !== -1 ||
        orig.toLowerCase().indexOf('persist') !== -1

      if (isConstitutionLike && nextText.indexOf(MARKER) === -1) {
        nextText = nextText.replace(/\s+$/, '') + '\n' + RULES_BLOCK
        applied = true
      }

      if (applied) {
        rec.set('rule_text', nextText)
        app.saveNoValidate(rec)
        updated++
        console.log(
          '[MIGRATION 1763000001] bia_learnings ' +
            rec.id +
            ' (prioridade ' +
            rec.getInt('priority') +
            ') atualizado: telefone removido=' +
            scrubbed.changed +
            ', regras v6.1 aplicadas=' +
            (nextText.indexOf(MARKER) !== -1),
        )
      }
    }
    console.log(
      '[MIGRATION 1763000001] Concluída: ' + updated + ' registro(s) bia_learnings atualizado(s).',
    )
  },
  (app) => {
    // down: no-op (a limpeza de telefone e as regras de segurança não são revertidas)
  },
)
