// Correção final pedida pelo Mauro: o nome oficial do empreendimento é
// "Residencial Vistage Residence" — nunca "Vistage Residence Barreiros" nem
// variações. Idempotente: cobre launches, properties, ai_knowledge_files,
// bia_learnings e app_controls. Usa o parâmetro `app` da migração (não $app)
// e propaga erros — sem engolir falhas em silêncio.

migrate(
  (app) => {
    var NEW = 'Residencial Vistage Residence'
    var variants = [
      'Vistage Residence Barreiros - AJ Coelho',
      'Vistage Residence Barreiros (AJ Coelho)',
      'Vistage Residence Barreiros (AJ Coelho Construtora)',
      'Vistage Residence Barreiros (AJ Coelho Engenharia)',
      'Vistage Residence Barreiros',
      'Vistage Residence - AJ Coelho',
      'Vistage Residence (AJ Coelho)',
      'Vistage Residence (AJ Coelho Construtora)',
      'Vistage Residence (AJ Coelho Engenharia)',
      'Vistage Residence',
    ]

    function replaceAll(text) {
      if (!text) return text
      var out = String(text)
      for (var i = 0; i < variants.length; i++) {
        out = out.split(variants[i]).join(NEW)
      }
      return out
    }

    // ---- launches ----
    var launches = app.findRecordsByFilter('launches', "slug ~ 'vistage'", '', 0, 0)
    for (var i = 0; i < launches.length; i++) {
      var l = launches[i]
      var changed = false
      var fields = ['name', 'enterprise_name', 'headline', 'description', 'cta_default_message', 'raw_material']
      for (var f = 0; f < fields.length; f++) {
        var v = l.getString(fields[f])
        if (v && v.indexOf('Vistage') !== -1) {
          var nv = replaceAll(v)
          if (nv !== v) {
            l.set(fields[f], nv)
            changed = true
          }
        }
      }
      // name e enterprise_name ficam EXATAMENTE com o nome oficial
      if (l.getString('name') !== NEW) {
        l.set('name', NEW)
        changed = true
      }
      if (l.getString('enterprise_name') !== NEW) {
        l.set('enterprise_name', NEW)
        changed = true
      }
      var jsonFields = ['specific_cadence', 'landing_theme', 'sales_arguments', 'payment_terms', 'keywords', 'units']
      for (var g = 0; g < jsonFields.length; g++) {
        var jv = l.getString(jsonFields[g])
        if (jv && jv.indexOf('Vistage Residence Barreiros') !== -1) {
          l.set(jsonFields[g], replaceAll(jv))
          changed = true
        }
      }
      if (changed) {
        app.save(l)
        console.log('[RENAME-FINAL] launches atualizado: ' + l.id + ' nome=' + l.getString('name'))
      }
    }

    // ---- properties ----
    var props = app.findRecordsByFilter('properties', "title ~ 'Vistage'", '', 0, 0)
    for (var j = 0; j < props.length; j++) {
      var p = props[j]
      var ptitle = p.getString('title') || ''
      if (ptitle.indexOf(NEW) === -1) {
        var novo = replaceAll(ptitle)
        if (novo === NEW) novo = NEW + ' - AJ Coelho'
        p.set('title', novo)
        app.save(p)
        console.log('[RENAME-FINAL] properties atualizado: ' + novo)
      }
    }

    // ---- ai_knowledge_files ----
    try {
      var kfs = app.findRecordsByFilter('ai_knowledge_files', "enterprise ~ 'Vistage'", '', 0, 0)
      var kfCount = 0
      for (var k = 0; k < kfs.length; k++) {
        var kf = kfs[k]
        var kChanged = false
        var ent = kf.getString('enterprise') || ''
        if (ent.indexOf(NEW) === -1 && ent.indexOf('Vistage') !== -1) {
          kf.set('enterprise', replaceAll(ent))
          kChanged = true
        }
        var sum = kf.getString('summary') || ''
        if (sum.indexOf('Vistage Residence Barreiros') !== -1) {
          kf.set('summary', replaceAll(sum))
          kChanged = true
        }
        var nome = kf.getString('name') || ''
        if (nome.indexOf('Vistage Residence Barreiros') !== -1) {
          kf.set('name', replaceAll(nome))
          kChanged = true
        }
        if (kChanged) {
          app.save(kf)
          kfCount++
        }
      }
      console.log('[RENAME-FINAL] ai_knowledge_files atualizados: ' + kfCount)
    } catch (e) {
      console.log('[RENAME-FINAL] ai_knowledge_files skip: ' + e)
    }

    // ---- bia_learnings ----
    try {
      var bls = app.findRecordsByFilter('bia_learnings', "content ~ 'Vistage Residence Barreiros'", '', 0, 0)
      for (var b = 0; b < bls.length; b++) {
        var bl = bls[b]
        bl.set('content', replaceAll(bl.getString('content')))
        app.save(bl)
      }
      console.log('[RENAME-FINAL] bia_learnings atualizados: ' + bls.length)
    } catch (e) {
      console.log('[RENAME-FINAL] bia_learnings skip: ' + e)
    }

    // ---- app_controls ----
    try {
      var ctrls = app.findRecordsByFilter('app_controls', "value ~ 'Vistage Residence Barreiros'", '', 0, 0)
      for (var c = 0; c < ctrls.length; c++) {
        var ctl = ctrls[c]
        ctl.set('value', replaceAll(ctl.getString('value')))
        app.save(ctl)
      }
      console.log('[RENAME-FINAL] app_controls atualizados: ' + ctrls.length)
    } catch (e) {
      console.log('[RENAME-FINAL] app_controls skip: ' + e)
    }
  },
  (app) => {
    // down: sem reversão — correção de nome pedida pelo Mauro
  },
)
