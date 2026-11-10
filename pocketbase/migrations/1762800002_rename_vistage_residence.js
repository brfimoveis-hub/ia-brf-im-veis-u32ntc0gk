// Correção pedida pelo Mauro: o nome oficial do empreendimento é
// "Residencial Vistage Residence" — nunca "Vistage Residence Barreiros" sozinho
// nem variações. Idempotente: atualiza launches, properties, ai_knowledge_files,
// bia_learnings e app_controls referentes ao Vistage.

migrate(
  (app) => {
    var OLD = 'Vistage Residence Barreiros'
    var NEW = 'Residencial Vistage Residence'
    var variants = [
      'Vistage Residence Barreiros - AJ Coelho',
      'Vistage Residence Barreiros (AJ Coelho)',
      'Vistage Residence Barreiros (AJ Coelho Construtora)',
      'Vistage Residence Barreiros (AJ Coelho Engenharia)',
      'Vistage Residence Barreiros',
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
    try {
      var launches = $app.findRecordsByFilter('launches', "slug ~ 'vistage'", '', 0, 0)
      for (var i = 0; i < launches.length; i++) {
        var l = launches[i]
        var changed = false
        var fields = ['name', 'enterprise_name', 'headline', 'description', 'cta_default_message']
        for (var f = 0; f < fields.length; f++) {
          var v = l.getString(fields[f])
          if (v && v.indexOf(OLD) !== -1) {
            l.set(fields[f], replaceAll(v))
            changed = true
          }
        }
        var jsonFields = [
          'specific_cadence',
          'landing_theme',
          'sales_arguments',
          'payment_terms',
          'raw_material',
          'keywords',
          'units',
        ]
        for (var g = 0; g < jsonFields.length; g++) {
          var jv = l.getString(jsonFields[g])
          if (jv && jv.indexOf(OLD) !== -1) {
            l.set(jsonFields[g], replaceAll(jv))
            changed = true
          }
        }
        if (changed) {
          $app.save(l)
          console.log('launches atualizado: ' + l.getString('name'))
        }
      }
    } catch (e) {
      console.log('launches skip: ' + e)
    }

    // ---- properties ----
    try {
      var props = $app.findRecordsByFilter('properties', "title ~ 'Vistage'", '', 0, 0)
      for (var j = 0; j < props.length; j++) {
        var p = props[j]
        var ptitle = p.getString('title')
        if (ptitle && ptitle.indexOf(OLD) !== -1) {
          p.set('title', replaceAll(ptitle))
          $app.save(p)
          console.log('properties atualizado: ' + p.getString('title'))
        }
      }
    } catch (e) {
      console.log('properties skip: ' + e)
    }

    // ---- ai_knowledge_files ----
    try {
      var kfs = $app.findRecordsByFilter(
        'ai_knowledge_files',
        "description ~ 'Vistage Residence Barreiros'",
        '',
        0,
        0,
      )
      for (var k = 0; k < kfs.length; k++) {
        var kf = kfs[k]
        kf.set('description', replaceAll(kf.getString('description')))
        $app.save(kf)
      }
      console.log('ai_knowledge_files atualizados: ' + kfs.length)
    } catch (e) {
      console.log('ai_knowledge_files skip: ' + e)
    }

    // ---- bia_learnings ----
    try {
      var bls = $app.findRecordsByFilter(
        'bia_learnings',
        "content ~ 'Vistage Residence Barreiros'",
        '',
        0,
        0,
      )
      for (var b = 0; b < bls.length; b++) {
        var bl = bls[b]
        bl.set('content', replaceAll(bl.getString('content')))
        $app.save(bl)
      }
      console.log('bia_learnings atualizados: ' + bls.length)
    } catch (e) {
      console.log('bia_learnings skip: ' + e)
    }

    // ---- app_controls ----
    try {
      var ctrls = $app.findRecordsByFilter(
        'app_controls',
        "value ~ 'Vistage Residence Barreiros'",
        '',
        0,
        0,
      )
      for (var c = 0; c < ctrls.length; c++) {
        var ctl = ctrls[c]
        ctl.set('value', replaceAll(ctl.getString('value')))
        $app.save(ctl)
      }
      console.log('app_controls atualizados: ' + ctrls.length)
    } catch (e) {
      console.log('app_controls skip: ' + e)
    }
  },
  (app) => {
    // down: sem reversão — é a correção pedida pelo Mauro (nunca "Barreiros" sozinho)
  },
)
