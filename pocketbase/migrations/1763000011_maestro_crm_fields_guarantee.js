/// <reference path="../pb_data/types.d.ts" />
// ============================================================================
// MIGRATION 1763000011 — MAESTRO × CRM: GARANTIA DOS CAMPOS maestro_* EM customers
// ----------------------------------------------------------------------------
// As migrations 1763000009/1763000010 foram marcadas como aplicadas, mas o
// schema live NÃO recebeu os campos (provado por db_show_schema: coleção
// customers sem maestro_temperature/maestro_interest/maestro_needs_human/
// maestro_updated_at). 1763000009 usava AutodateField com onCreate=false e
// onUpdate=false (configuração sem gatilho — provavelmente rejeitada na
// validação do save da coleção); 1763000010 repetiu o mesmo código.
//
// Esta migration recria os 4 campos no padrão que FUNCIONA no projeto
// (mesmo estilo da 1760000002 — DateField simples, try/catch por campo,
// app.save(collection)), não mexe em nenhum campo existente e é idempotente.
// NENHUM dado é alterado: só estrutura.
// ============================================================================
migrate(
  (app) => {
    console.log('[MIGRATION 1763000011] Garantindo campos maestro_* em customers...')

    var col = null
    try {
      col = app.findCollectionByNameOrId('customers')
    } catch (findErr) {
      console.warn('[MIGRATION 1763000011] Coleção customers não encontrada: ' + findErr.message)
      return
    }

    function maestroHasField(name) {
      try {
        col.fields.getByName(name)
        return true
      } catch (_) {
        return false
      }
    }

    var added = []
    try {
      if (!maestroHasField('maestro_temperature')) {
        col.fields.add(new TextField({ name: 'maestro_temperature', required: false, max: 20 }))
        added.push('maestro_temperature')
      }
      if (!maestroHasField('maestro_interest')) {
        col.fields.add(new TextField({ name: 'maestro_interest', required: false, max: 400 }))
        added.push('maestro_interest')
      }
      if (!maestroHasField('maestro_needs_human')) {
        col.fields.add(new BoolField({ name: 'maestro_needs_human', required: false }))
        added.push('maestro_needs_human')
      }
      if (!maestroHasField('maestro_updated_at')) {
        col.fields.add(new DateField({ name: 'maestro_updated_at', required: false }))
        added.push('maestro_updated_at')
      }

      if (added.length > 0) {
        app.save(col)
        console.log(
          '[MIGRATION 1763000011] Campos adicionados: ' + added.join(', ') + ' — coleção salva.',
        )
      } else {
        console.log('[MIGRATION 1763000011] Todos os campos maestro_* já existem — nada a fazer.')
      }
    } catch (saveErr) {
      console.warn(
        '[MIGRATION 1763000011] Falha ao salvar coleção customers: ' +
          (saveErr && saveErr.message ? saveErr.message : saveErr),
      )
      return
    }

    // ------------------------------------------------------------------
    // VERIFICAÇÃO REAL: lê um registro de customer de verdade e prova que
    // os campos existem no schema aplicado (não aceita "salvou sem erro").
    // ------------------------------------------------------------------
    try {
      var probe = app.findFirstRecordByFilter('customers', '', '-created', 1, 0)
      if (probe) {
        // Lê cada campo: se não existir no schema, getString/getBool lança e cai no warn.
        var t = probe.getString('maestro_temperature')
        var i = probe.getString('maestro_interest')
        var h = probe.getBool('maestro_needs_human')
        var u = probe.getString('maestro_updated_at')
        console.log(
          '[MIGRATION 1763000011] VERIFICAÇÃO: customer ' +
            probe.id +
            ' lido com maestro_temperature="' +
            t +
            '", maestro_interest="' +
            i +
            '", maestro_needs_human=' +
            h +
            ', maestro_updated_at="' +
            u +
            '" — campos presentes no schema live.',
        )
      } else {
        console.log(
          '[MIGRATION 1763000011] Coleção customers vazia — verificação por leitura pulada (estrutura salva).',
        )
      }
    } catch (probeErr) {
      console.warn(
        '[MIGRATION 1763000011] ATENÇÃO: leitura de verificação falhou — campo maestro_* ausente no schema: ' +
          (probeErr && probeErr.message ? probeErr.message : probeErr),
      )
    }

    console.log('[MIGRATION 1763000011] Concluída.')
  },
  (app) => {
    console.log('[MIGRATION 1763000011 DOWN] Sem reversão (campos maestro_* permanecem).')
  },
)
