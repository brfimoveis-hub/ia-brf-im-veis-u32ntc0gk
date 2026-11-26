/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000012 — MAESTRO × CRM: CAMPOS maestro_* EM customers
// ----------------------------------------------------------------------------
// As migrations 1763000009/10/11 rodaram "applied" sem nunca adicionar os
// campos (provado 3x por db_show_schema + leitura de registro).
// Nesta rodada a causa raiz foi provada: na JSVM, col.fields.add() não é
// observável em memória; a única forma provada de funcionar é a mesma da
// 1760000002 — adicionar + app.save(col) + round-trip pós-save.
// Depois de salvar, lê registros reais e RELATA os valores dos 4 campos.
// Não mexe em nenhum campo existente: só adiciona o que faltar.
// ============================================================================
migrate(
  (app) => {
    function maestroHasField(collection, name) {
      try {
        if (collection.fields.getByName(name)) return true
      } catch (_) {}
      try {
        for (var i = 0; i < collection.fields.length; i++) {
          var f = collection.fields.get(i)
          if (f && f.name === name) return true
        }
      } catch (_) {}
      return false
    }

    var col = app.findCollectionByNameOrId('customers')
    var added = []
    try {
      if (!maestroHasField(col, 'maestro_temperature')) {
        col.fields.add(new TextField({ name: 'maestro_temperature', required: false, max: 20 }))
        added.push('maestro_temperature')
      }
      if (!maestroHasField(col, 'maestro_interest')) {
        col.fields.add(new TextField({ name: 'maestro_interest', required: false, max: 400 }))
        added.push('maestro_interest')
      }
      if (!maestroHasField(col, 'maestro_needs_human')) {
        col.fields.add(new BoolField({ name: 'maestro_needs_human', required: false }))
        added.push('maestro_needs_human')
      }
      if (!maestroHasField(col, 'maestro_updated_at')) {
        col.fields.add(new DateField({ name: 'maestro_updated_at', required: false }))
        added.push('maestro_updated_at')
      }
    } catch (e) {
      throw new Error(
        '[MIGRATION 1763000012] Falha ao preparar campos: ' + (e && e.message ? e.message : e),
      )
    }

    try {
      app.save(col)
    } catch (e2) {
      throw new Error(
        '[MIGRATION 1763000012] Falha ao salvar coleção customers: ' +
          (e2 && e2.message ? e2.message : e2),
      )
    }

    // ---------- PROVA REAL (pós-save, round-trip) ----------
    var col2 = app.findCollectionByNameOrId('customers')
    var missing = []
    if (!maestroHasField(col2, 'maestro_temperature')) missing.push('maestro_temperature')
    if (!maestroHasField(col2, 'maestro_interest')) missing.push('maestro_interest')
    if (!maestroHasField(col2, 'maestro_needs_human')) missing.push('maestro_needs_human')
    if (!maestroHasField(col2, 'maestro_updated_at')) missing.push('maestro_updated_at')
    if (missing.length > 0) {
      throw new Error(
        '[MIGRATION 1763000012] FALHA: campos ausentes pós-save: ' + missing.join(', '),
      )
    }
    console.log(
      '[MIGRATION 1763000012] Campos garantidos pós-save (adicionados agora: ' +
        (added.length ? added.join(', ') : 'nenhum — já existiam') +
        ')',
    )

    // Lê registros reais e RELATA os 4 campos.
    var probes = app.findRecordsByFilter('customers', '', '-created', 5, 0)
    if (probes.length === 0) {
      console.log(
        '[MIGRATION 1763000012] Coleção customers vazia — estrutura salva (sem leitura possível).',
      )
      return
    }
    var sample = []
    for (var i = 0; i < probes.length; i++) {
      var r = probes[i]
      sample.push(
        r.id +
          ' temp="' +
          r.getString('maestro_temperature') +
          '"' +
          ' interest="' +
          r.getString('maestro_interest') +
          '"' +
          ' needs_human=' +
          r.getBool('maestro_needs_human') +
          ' updated_at="' +
          r.getString('maestro_updated_at') +
          '"',
      )
    }
    console.log(
      '[MIGRATION 1763000012] PROVA REAL: ' +
        probes.length +
        ' customers lidos com os 4 campos maestro_*:\n- ' +
        sample.join('\n- '),
    )
  },
  (app) => {
    console.log('[MIGRATION 1763000012 DOWN] Sem reversão (campos maestro_* permanecem).')
  },
)
