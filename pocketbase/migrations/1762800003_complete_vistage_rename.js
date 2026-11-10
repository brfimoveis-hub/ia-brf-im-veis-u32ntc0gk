// Finalização da renomeação pedida pelo Mauro: nome oficial do empreendimento é
// "Residencial Vistage Residence" — nunca "Vistage Residence Barreiros" sozinho.
// A migração 1762800002 rodou mas não alcançou estes campos/valores; esta é
// idempotente e completa o trabalho em launches, properties e ai_knowledge_files.

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
      'Vistage Residence',
    ]
    var suffixAj = ' - AJ Coelho'

    function replaceAll(text) {
      if (!text) return text
      var out = String(text)
      for (var i = 0; i < variants.length; i++) {
        out = out.split(variants[i]).join(NEW)
      }
      return out
    }

    // ---- launches ----
    try {
      var launches = $app.findRecordsByFilter('launches', "slug ~ 'vistage'", '', 0, 0)
      for (var i = 0; i < launches.length; i++) {
        var l = launches[i]
        var changed = false
        var textFields = [
          'name',
          'enterprise_name',
          'headline',
          'description',
          'cta_default_message',
        ]
        for (var f = 0; f < textFields.length; f++) {
          var v = l.getString(textFields[f])
          if (v && v.indexOf('Vistage') !== -1 && v.indexOf(NEW) === -1) {
            l.set(textFields[f], replaceAll(v))
            changed = true
          }
        }
        // name e enterprise_name ficam exatamente com o nome oficial
        if (l.getString('name') !== NEW) {
          l.set('name', NEW)
          changed = true
        }
        if (l.getString('enterprise_name') !== NEW) {
          l.set('enterprise_name', NEW)
          changed = true
        }
        var jsonFields = [
          'keywords',
          'landing_theme',
          'sales_arguments',
          'payment_terms',
          'specific_cadence',
          'units',
        ]
        for (var g = 0; g < jsonFields.length; g++) {
          var jv = l.getString(jsonFields[g])
          if (jv && jv.indexOf('Vistage Residence Barreiros') !== -1) {
            l.set(jsonFields[g], replaceAll(jv))
            changed = true
          }
        }
        if (changed) {
          $app.save(l)
          console.log('[RENAME] launches atualizado: ' + l.id)
        }
      }
    } catch (e) {
      console.log('[RENAME] launches skip: ' + e)
    }

    // ---- properties ----
    try {
      var props = $app.findRecordsByFilter('properties', "title ~ 'Vistage'", '', 0, 0)
      for (var j = 0; j < props.length; j++) {
        var p = props[j]
        var ptitle = p.getString('title') || ''
        if (ptitle.indexOf(NEW) === -1) {
          var novotitulo = replaceAll(ptitle)
          if (novotitulo === NEW) novotitulo = NEW + suffixAj
          p.set('title', novotitulo)
          $app.save(p)
          console.log('[RENAME] properties atualizado: ' + novotitulo + ' | id ' + p.id)
        }
      }
    } catch (e) {
      console.log('[RENAME] properties skip: ' + e)
    }

    // ---- ai_knowledge_files (enterprise + summary) ----
    try {
      var kfs = $app.findRecordsByFilter('ai_knowledge_files', "enterprise ~ 'Vistage'", '', 0, 0)
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
        if (kChanged) {
          $app.save(kf)
          console.log('[RENAME] ai_knowledge_files atualizado: ' + kf.id)
        }
      }
    } catch (e) {
      console.log('[RENAME] ai_knowledge_files skip: ' + e)
    }
  },
  (app) => {
    // down: sem reversão — correção pedida pelo Mauro
  },
)
