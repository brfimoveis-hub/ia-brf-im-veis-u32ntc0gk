/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração preventiva e idempotente:
 * Garante que nenhum registro de bia_learnings promova perguntar a clientes se
 * "olharam o material/ebook" que nunca foi enviado.
 * Se houver algum aprendizado ativo com esse padrão enganoso, marca is_active = false.
 * No-op em banco vazio ou sem registros correspondentes.
 */
migrate(
  (app) => {
    try {
      var col = app.findCollectionByNameOrId('bia_learnings')
      if (!col) return

      var learnings = app.findRecordsByFilter(
        'bia_learnings',
        "is_active = true && (rule_text ~ 'ebook' || rule_text ~ 'material')",
        '',
        50,
        0,
      )

      for (var i = 0; i < learnings.length; i++) {
        var rec = learnings[i]
        var ruleText = String(rec.getString('rule_text') || '').toLowerCase()
        // Padrão que induz Bia a perguntar sobre material não enviado
        if (
          ruleText.indexOf('olhou') !== -1 ||
          ruleText.indexOf('olhada') !== -1 ||
          ruleText.indexOf('ebook') !== -1
        ) {
          rec.set('is_active', false)
          rec.set(
            'notes',
            String(rec.getString('notes') || '') +
              ' [Desativado: regra proibida de presumir envio prévio de material/ebook sem confirmação real]',
          )
          app.saveNoValidate(rec)
        }
      }
    } catch (_) {
      // Idempotente / no-op
    }
  },
  (_app) => {
    // Revert no-op
  },
)
